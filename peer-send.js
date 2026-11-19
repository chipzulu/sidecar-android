import {tabletTextAllowed} from './shared/book-workflow.js';
import {annotationPaths,selectedFiles,selectedBase,guardAnnotationSend} from './shared/annotation-transfer.js';
import {gitBlobSha,checkBackupInventory} from './shared/github-backup.js';
import {peerIdentity,editOrigin,jsonOrigin,fileKind,receivePlan} from './shared/peer-state.js';
import {encodeNote,noteFilename} from './shared/annotation-brush.js';
import {workKey,readBookIdentity,bookIdentity,saveBook} from './storage.js';
export async function preparePeerSend(book){
 if(!book.syncBase||book.syncDetached||book.syncBase.identity!==peerIdentity(book.repository,book.branch))throw Error('Shared starting version is unknown. Nothing was sent.');
 const files=new Map(book.files.map(f=>[f.path,{...f}])),drafts=new Map();
 const prefix=workKey(book,'draft');
 for(const key of Object.keys(localStorage).filter(k=>k.startsWith(prefix))){
  const path=key.slice(prefix.length),draft=JSON.parse(localStorage.getItem(key)),file=files.get(path);
  if(!file||fileKind(path)!=='scene'||draft.base!==file.sha||typeof draft.html!=='string')throw Error('A locally edited scene has an unknown or changed starting version: '+path+'. Local work is kept.');
  const bytes=new TextEncoder().encode(draft.html);files.set(path,{path,bytes,sha:await gitBlobSha(bytes)});drafts.set(path,structuredClone(draft));
 }
 const rows=JSON.parse(localStorage.getItem(workKey(book,'highlights'))||'{}'),notes=new Map();
 for(const [id,row] of Object.entries(rows))if(row.dirty&&!row.discarded){
  if(row.needsInline)throw Error('An annotation is not yet saved into its scene. Open the scene and finish the note before sending.');
  const path='Book/Notes/'+noteFilename(id),bytes=new TextEncoder().encode(encodeNote(row.note));
  files.set(path,{path,bytes,sha:await gitBlobSha(bytes)});notes.set(id,structuredClone(row.note));
 }
 const captured=[...files.values()].map(f=>({...f,size:f.bytes.length}));checkBackupInventory(captured);
 return {files:captured,drafts,notes};
}
export async function publishPeerChanges(book,client,progress=()=>{}){
 if(await readBookIdentity(book.id)!==bookIdentity(book))throw Error('The offline book changed. Reopen it before sending.');
 reconcilePublished(book);
 const capture=await preparePeerSend(book),restricted=!tabletTextAllowed(book);
 const remote=restricted?await client.download(progress,book.files):await client.inspect();
 let paths=null,files=capture.files,prior={head:book.syncBase.commit};
 if(restricted){try{paths=annotationPaths(book.syncBase,capture.files);}catch(e){throw Error(e.message.replace('Use the full changes action.','Enable manuscript editing on PC, send the setting and receive it here before sending the complete scene. Your local work is kept.'));}guardAnnotationSend(book.syncBase,capture.files,remote.files,paths);files=selectedFiles(remote.files,capture.files,paths);prior={head:remote.head};}
 // Conservative Step 2: any competing remote commit stops the full snapshot send.
 const result=await client.upload(remote,files,prior,progress);
 if(await readBookIdentity(book.id)!==bookIdentity(book))throw Error('GitHub accepted the snapshot, but this device changed books during sending. Local work was retained. Reopen and check before retrying.');
 const base=restricted?selectedBase(book.syncBase,book.repository,book.branch,result.head,files,paths):null;
 const next={...book,files:restricted?selectedFiles(book.files,files,paths):files,commit:base?base.commit:result.head,peerReceipt:{drafts:[...capture.drafts].filter(([path])=>!paths||paths.has(path)),notes:[...capture.notes].filter(([id])=>!paths||paths.has('Book/Notes/'+noteFilename(id)))}};await saveBook(next,{sent:true,base});
 reconcilePublished(next);return {book:next,uploaded:result.uploaded,scenes:capture.drafts.size,annotations:capture.notes.size,restricted,retainedDrafts:restricted?[...capture.drafts.keys()].filter(path=>!paths.has(path)).length:0};
}

export function reconcilePublished(next){
 const receipt=next.peerReceipt;if(!receipt)return;
 for(const [path,draft] of receipt.drafts){
  const key=workKey(next,'draft',path),latest=JSON.parse(localStorage.getItem(key)||'null');if(!latest)continue;
  if(JSON.stringify(latest)===JSON.stringify(draft))localStorage.removeItem(key);
  else {const file=next.files.find(f=>f.path===path);localStorage.setItem(key,JSON.stringify({...latest,base:file.sha,syncOrigin:jsonOrigin(editOrigin(next,path,null))}));}
 }
 const key=workKey(next,'highlights'),rows=JSON.parse(localStorage.getItem(key)||'{}');
 for(const [id,note] of receipt.notes){const row=rows[id];if(!row)continue;
  const file=next.files.find(f=>f.path==='Book/Notes/'+noteFilename(id));
  if(JSON.stringify(row.note)===JSON.stringify(note))rows[id]={...row,dirty:false,main:file.sha,base:file.sha,needsInline:false};
 }
 localStorage.setItem(key,JSON.stringify(rows));
}

export async function receivePeerBook(previous,incoming){
 if(await readBookIdentity(previous.id)!==bookIdentity(previous))throw Error('The local book changed while downloading. Retry receive.');
 reconcilePublished(previous);
 const local=await preparePeerSend(previous),plan=receivePlan(previous.syncBase,previous.repository,previous.branch,local.files,incoming.files);
 if(plan.conflicts.length)throw Error('Receive stopped. Both copies changed these files: '+plan.conflicts.join('; ')+'. No local files or drafts were changed. Comparison is not available yet.');
 const remote=new Map(incoming.files.map(f=>[f.path,f.sha])),current=new Map(local.files.map(f=>[f.path,f.sha]));
 incoming.peerReceipt={drafts:[...local.drafts].filter(([path])=>current.get(path)===remote.get(path)),notes:[...local.notes].filter(([id])=>{const path='Book/Notes/'+noteFilename(id);return current.get(path)===remote.get(path);})};
 await saveBook(incoming);reconcilePublished(incoming);
 return {applied:plan.apply.length,kept:plan.keep.length};
}
