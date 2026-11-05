// Browser-native authenticated encryption. Only ciphertext and public KDF
// parameters are persisted; neither the passphrase nor derived key is saved.
const ITERATIONS=600000;
const encode=bytes=>btoa(String.fromCharCode(...bytes));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const context=repository=>new TextEncoder().encode('sidecar-reader-token:v1:'+repository.toLowerCase());
async function keyFor(passphrase,salt){
  const bytes=new TextEncoder().encode(passphrase);
  try {const material=await crypto.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveKey']);
    return await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }finally{bytes.fill(0);}
}
export async function sealToken(repository,token,passphrase){
  if(passphrase.length<8||!passphrase.trim())throw Error('Use a passphrase of at least 8 characters. A few memorable words work well.');
  if(passphrase.length>1024)throw Error('Passphrase is too long.');
  token=token.trim();if(!token||token.length>4096)throw Error('Enter a GitHub token to save.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFor(passphrase,salt),bytes=new TextEncoder().encode(token);
  try {const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(repository),tagLength:128},key,bytes);
    return {version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))};
  }finally{bytes.fill(0);}
}
export async function unsealToken(repository,record,passphrase){
  if(!passphrase)throw Error('Enter your passphrase to unlock GitHub.');
  if(passphrase.length>1024)throw Error('Passphrase is too long.');
  try{
    if(record?.version!==1||record.kdf!=='PBKDF2-SHA256'||record.iterations!==ITERATIONS)throw Error();
    if(typeof record.ciphertext!=='string'||record.ciphertext.length>6000||typeof record.salt!=='string'||record.salt.length!==24||typeof record.iv!=='string'||record.iv.length!==16)throw Error();
    const salt=decode(record.salt),iv=decode(record.iv),ciphertext=decode(record.ciphertext);
    if(salt.length!==16||iv.length!==12||ciphertext.length<17)throw Error();
    const key=await keyFor(passphrase,salt),bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:context(repository),tagLength:128},key,ciphertext));
    try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}finally{bytes.fill(0);}
  }catch{throw Error('Could not unlock: the passphrase is incorrect or the saved credential is damaged. Try again, or forget it and save a new token.');}
}
let database;
function db(){return database ||= new Promise((resolve,reject)=>{const request=indexedDB.open('sidecar-reader-credentials',1);request.onupgradeneeded=()=>request.result.createObjectStore('tokens');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Credential storage is unavailable. You can still use a session-only token.'));});}
export async function readCredential(repository){const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('tokens').objectStore('tokens').get(repository.toLowerCase());request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Could not read the saved credential.'));});}
export async function writeCredential(repository,record){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('tokens','readwrite'),store=tx.objectStore('tokens');if(record)store.put(record,repository.toLowerCase());else store.delete(repository.toLowerCase());tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('Could not update the saved credential. Your book is unchanged.'));});}
