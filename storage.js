const db=new Promise((resolve,reject)=>{const r=indexedDB.open('sidecar-android-reader',1);r.onupgradeneeded=()=>r.result.createObjectStore('books');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Browser storage unavailable.'));});
export function bookIdentity(book){return book?JSON.stringify([book.repository.toLowerCase(),book.branch,book.commit]):null;}
async function read(key){const d=await db;return new Promise((resolve,reject)=>{const r=d.transaction('books').objectStore('books').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read the offline book.'));});}
export const readBook=()=>read('current');
export const readBookIdentity=()=>read('identity');
export async function saveBook(book){const d=await db;return new Promise((resolve,reject)=>{const t=d.transaction('books','readwrite');const books=t.objectStore('books');books.put(book,'current');books.put(bookIdentity(book),'identity');t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(Error('Could not save the download. Previous offline book retained; check device storage.'));});}

export async function removeBook(book){
  const repository=book.repository.toLowerCase(),branch=book.branch;
  const d=await db;
  await new Promise((resolve,reject)=>{
    const tx=d.transaction('books','readwrite'),store=tx.objectStore('books');
    const current=store.get('identity');
    current.onsuccess=()=>{
      if(current.result!==bookIdentity(book)){tx.abort();return;}
      store.delete('current');store.delete('identity');
    };
    tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('The offline book changed. Reopen it before removing it.'));
  });
  for(const key of Object.keys(localStorage)){
    if(key.startsWith('sidecar-draft:')){
      let parts;try{parts=JSON.parse(key.slice('sidecar-draft:'.length));}catch{continue;}
      if(!Array.isArray(parts))continue;
      const [repo,ref]=parts;
      if(repo===repository&&ref===branch)localStorage.removeItem(key);
    }
  }
  localStorage.removeItem('sidecar-highlights:'+JSON.stringify([repository,branch]));
  localStorage.removeItem('sidecar-reader:position:'+repository+':'+branch);
}
