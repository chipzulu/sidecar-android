import {sharedBase} from './shared/peer-state.js';
import {listCredentialRepositories} from './token-vault.js';
import {validInk} from './shared/annotation-ink.js';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const completed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('Library transaction cancelled.'));});
const database=new Promise((resolve,reject)=>{
 const r=indexedDB.open('sidecar-android-reader',2);
 r.onupgradeneeded=()=>{
  const d=r.result,tx=r.transaction;
  const library=d.createObjectStore('library',{keyPath:'id'});library.createIndex('remote','remote',{unique:true});
  d.createObjectStore('snapshots');d.createObjectStore('meta');d.createObjectStore('connections',{keyPath:'key'});
  tx.objectStore('meta').put(true,'resetPending');
  if(d.objectStoreNames.contains('books')){
   const old=tx.objectStore('books');const get=old.get('current');
   get.onsuccess=()=>{const b=get.result;if(b?.repository&&b?.branch){const c=connection(b);tx.objectStore('connections').put(c);tx.objectStore('meta').put(c.key,'lastConnection');}d.deleteObjectStore('books');};
  }
 };
 r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};
 r.onerror=()=>reject(Error('Library storage unavailable.'));
 r.onblocked=()=>reject(Error('Close other Reader windows, then reopen to prepare the library.'));
});
function connection(book){const repository=book.repository.toLowerCase(),branch=book.branch;return {key:JSON.stringify([repository,branch]),type:'github',repository,branch};}
export function bookIdentity(book){return book?.id?JSON.stringify([book.id,book.revision]):null;}
export function workKey(book,kind,detail=''){if(!book?.id)throw Error('Book has no library identity.');return 'sidecar-book:'+book.id+':'+kind+':'+detail;}
export function clearBookWork(book){const prefix='sidecar-book:'+book.id+':';for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key);}
export const libraryReady=(async()=>{
 const d=await database;
 const reset=await request(d.transaction('meta').objectStore('meta').get('resetPending'));
 if(reset){
  // Recover repository names from saved credentials without reading or copying token values.
  const repos=await listCredentialRepositories();
  const existing=await request(d.transaction('connections').objectStore('connections').getAll());
  const profiles=d.transaction('connections','readwrite'),profilesDone=completed(profiles);
  for(const repository of repos)if(typeof repository==='string'&&!existing.some(c=>c.repository===repository.toLowerCase()))profiles.objectStore('connections').put(connection({repository,branch:'main'}));
  await profilesDone;
  // Deliberate one-time reset, authorized for the library format. Credentials live in a separate DB.
  for(const key of Object.keys(localStorage))if(key.startsWith('sidecar-draft:')||key.startsWith('sidecar-highlights:')||key.startsWith('sidecar-reader:position:')||key.startsWith('sidecar-reader:card:'))localStorage.removeItem(key);
  const tx=d.transaction('meta','readwrite'),done=completed(tx);tx.objectStore('meta').delete('resetPending');await done;
 }
})();
async function db(){await libraryReady;return database;}
export async function listConnections(){const d=await db();return request(d.transaction('connections').objectStore('connections').getAll());}
export async function rememberConnection(book){const d=await db(),c=connection(book),tx=d.transaction(['connections','meta'],'readwrite'),done=completed(tx);tx.objectStore('connections').put(c);tx.objectStore('meta').put(c.key,'lastConnection');await done;return c;}
export async function lastConnection(){const d=await db(),key=await request(d.transaction('meta').objectStore('meta').get('lastConnection'));return key?request(d.transaction('connections').objectStore('connections').get(key)):null;}
export async function readBook(id){const d=await db();id ||= await request(d.transaction('meta').objectStore('meta').get('active'));const book=id?await request(d.transaction('snapshots').objectStore('snapshots').get(id)):undefined;if(book&&!book.syncBase&&!book.syncDetached&&book.commit)book.syncBase=sharedBase(book.repository,book.branch,book.commit,book.files);return book;}
export async function readBookIdentity(id){return bookIdentity(await readBook(id));}
export async function findBook(repository,branch){const d=await db(),row=await request(d.transaction('library').objectStore('library').index('remote').get(connection({repository,branch}).key));return row?readBook(row.id):undefined;}
export async function selectBook(id){const d=await db(),tx=d.transaction(['library','meta'],'readwrite'),done=completed(tx);const r=tx.objectStore('library').get(id);r.onsuccess=()=>{if(!r.result){tx.abort();return;}tx.objectStore('meta').put(id,'active');};await done;return readBook(id);}
export async function saveBook(book,{sent=false,base=null}={}){
 const d=await db(),c=connection(book),tx=d.transaction(['library','snapshots','meta','connections'],'readwrite'),done=completed(tx),store=tx.objectStore('library');let saved;
 const get=store.index('remote').get(c.key);
 get.onsuccess=()=>{
  const previous=get.result,id=previous?.id||crypto.randomUUID(),now=new Date().toISOString();
  saved={...book,id,revision:crypto.randomUUID(),syncDetached:false,syncBase:base||sharedBase(book.repository,book.branch,book.commit,book.files)};
  store.put({id,remote:c.key,connection:c,title:book.title||previous?.title||book.repository,createdAt:previous?.createdAt||now,lastReceivedAt:sent?(previous?.lastReceivedAt||null):now,lastSentAt:sent?now:(previous?.lastSentAt||null)});
  tx.objectStore('snapshots').put(saved,id);tx.objectStore('meta').put(id,'active');tx.objectStore('connections').put(c);tx.objectStore('meta').put(c.key,'lastConnection');
 };
 await done;Object.assign(book,{id:saved.id,revision:saved.revision,syncBase:saved.syncBase,syncDetached:false});return saved;
}
export async function removeBook(book){
 const d=await db(),tx=d.transaction(['library','snapshots','meta'],'readwrite'),done=completed(tx);
 const r=tx.objectStore('snapshots').get(book.id);
 r.onsuccess=()=>{if(bookIdentity(r.result)!==bookIdentity(book)){tx.abort();return;}tx.objectStore('library').delete(book.id);tx.objectStore('snapshots').delete(book.id);tx.objectStore('meta').delete('writer:'+book.id);tx.objectStore('meta').delete('writer-info:'+book.id);const a=tx.objectStore('meta').get('active');a.onsuccess=()=>{if(a.result===book.id)tx.objectStore('meta').delete('active');};};
 await done;clearBookWork(book);
}
export async function markBookSent(book){const d=await db(),tx=d.transaction('library','readwrite'),done=completed(tx),s=tx.objectStore('library'),r=s.get(book.id);r.onsuccess=()=>{if(r.result)s.put({...r.result,lastSentAt:new Date().toISOString()});};await done;}
export async function listBooks(){const d=await db(),rows=await request(d.transaction('library').objectStore('library').getAll());return Promise.all(rows.map(async row=>({...row,writerStrokes:(await request(d.transaction('meta').objectStore('meta').get('writer-info:'+row.id)))?.strokes||0,writerTextUnits:(await request(d.transaction('meta').objectStore('meta').get('writer-info:'+row.id)))?.textUnits||0,offline:true,hasLocalWork:Object.keys(localStorage).some(k=>k.startsWith('sidecar-book:'+row.id+':draft:')),remoteStatus:row.remoteCheckedAt?(row.remoteChanged?'newer-backup':'up-to-date'):'not-checked'})));}

export async function relinkBook(book,repository,branch){
 const d=await db(),c=connection({repository,branch}),tx=d.transaction(['library','snapshots','connections'],'readwrite'),done=completed(tx);
 const rows=tx.objectStore('library'),get=rows.get(book.id);
 get.onsuccess=()=>{if(!get.result){tx.abort();return;}rows.put({...get.result,remote:c.key,connection:c,lastReceivedAt:null,lastSentAt:null,remoteCheckedAt:null,checkedCommit:null});const r=tx.objectStore('snapshots').get(book.id);r.onsuccess=()=>{if(bookIdentity(r.result)!==bookIdentity(book)){tx.abort();return;}tx.objectStore('snapshots').put({...r.result,repository:c.repository,branch,syncBase:null,peerReceipt:null,syncDetached:true,revision:crypto.randomUUID()},book.id);};tx.objectStore('connections').put(c);};
 await done;return readBook(book.id);
}

export async function recordRemoteCheck(book,commit){
 const d=await db(),tx=d.transaction(['library','snapshots'],'readwrite'),done=completed(tx),r=tx.objectStore('snapshots').get(book.id);
 r.onsuccess=()=>{if(bookIdentity(r.result)!==bookIdentity(book)){tx.abort();return;}const rows=tx.objectStore('library'),get=rows.get(book.id);get.onsuccess=()=>{if(!get.result){tx.abort();return;}rows.put({...get.result,remoteCheckedAt:new Date().toISOString(),checkedCommit:commit,remoteChanged:commit!==book.commit});};};await done;
}

export async function readWriterDraft(book){
 const d=await db(),row=await request(d.transaction('meta').objectStore('meta').get('writer:'+book.id));
 if(row&&(!row.ink||!validInk(row.ink)))throw Error('The saved writer draft could not be read. It has not been overwritten.');
 return row||null;
}
export async function writeWriterDraft(book,ink,expectedRevision,textState){
 if(!ink||!validInk(ink))throw Error('Invalid writer handwriting.');
 const d=await db(),tx=d.transaction(['library','meta'],'readwrite'),done=completed(tx),meta=tx.objectStore('meta');
 let reason,revision=crypto.randomUUID();
 const found=tx.objectStore('library').get(book.id);
 found.onsuccess=()=>{
  if(!found.result){reason=Error('This book was removed. Your handwriting is still on screen.');tx.abort();return;}
  const previous=meta.get('writer-info:'+book.id);previous.onsuccess=()=>{
   if((previous.result?.revision||null)!==(expectedRevision||null)){reason=Error('Another Reader window changed this writer draft. This copy is still on screen.');tx.abort();return;}
   const updatedAt=new Date().toISOString();
   const current=meta.get('writer:'+book.id);current.onsuccess=()=>{
    const text=textState===undefined?(current.result?.text||{accepted:[],pending:null}):textState;
    try{
     meta.put({ink,revision,updatedAt,text},'writer:'+book.id);
     meta.put({revision,updatedAt,strokes:ink.strokes.length,textUnits:text.accepted.length+(text.pending?1:0)},'writer-info:'+book.id);
    }catch(e){reason=e;try{tx.abort();}catch{}}
   };
  };
 };
 try{await done;}catch(e){throw reason||e;}return revision;
}
export async function clearWriterDraft(book){const d=await db(),tx=d.transaction('meta','readwrite'),done=completed(tx);tx.objectStore('meta').delete('writer:'+book.id);tx.objectStore('meta').delete('writer-info:'+book.id);await done;}
