const db=new Promise((resolve,reject)=>{const r=indexedDB.open('sidecar-android-reader',1);r.onupgradeneeded=()=>r.result.createObjectStore('books');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Browser storage unavailable.'));});
export function bookIdentity(book){return book?JSON.stringify([book.repository.toLowerCase(),book.branch,book.commit]):null;}
async function read(key){const d=await db;return new Promise((resolve,reject)=>{const r=d.transaction('books').objectStore('books').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read the offline book.'));});}
export const readBook=()=>read('current');
export const readBookIdentity=()=>read('identity');
export async function saveBook(book){const d=await db;return new Promise((resolve,reject)=>{const t=d.transaction('books','readwrite');const books=t.objectStore('books');books.put(book,'current');books.put(bookIdentity(book),'identity');t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(Error('Could not save the download. Previous offline book retained; check device storage.'));});}
