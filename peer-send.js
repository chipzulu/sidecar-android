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
 const capture=await preparePeerSend(book),remote=await client.inspect();
 // Conservative Step 2: any competing remote commit stops the full snapshot send.
 const result=await client.upload(remote,capture.files,{head:book.syncBase.commit},progress);
 if(await readBookIdentity(book.id)!==bookIdentity(book))throw Error('GitHub accepted the snapshot, but this device changed books during sending. Local work was retained. Reopen and check before retrying.');
 const next={...book,files:capture.files,commit:result.head,peerReceipt:{drafts:[...capture.drafts],notes:[...capture.notes]}};await saveBook(next,{sent:true});
 reconcilePublished(next);return {book:next,uploaded:result.uploaded,scenes:capture.drafts.size,annotations:capture.notes.size};
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
