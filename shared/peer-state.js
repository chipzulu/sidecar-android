// Step 1 only: local bookkeeping. This module never uploads or applies files.
export const peerIdentity=(repository,branch)=>JSON.stringify([repository.toLowerCase(),branch]);
export function fileKind(path){
 if(/^Book\/Chapters\/.+\.html?$/i.test(path)&&!path.split('/').slice(2,-1).some(p=>p.toLowerCase()==='notes'))return 'scene';
 if(/\/Highlight [a-f0-9-]{36}\.md$/.test(path))return 'annotation';
 return 'other';
}
export function sharedBase(repository,branch,commit,files){
 if(!repository||!branch||!commit)throw Error('A confirmed repository, branch and commit are required.');
 const entries=Object.create(null);
 for(const f of files){if(!f.path||!f.sha||Object.hasOwn(entries,f.path))throw Error('Invalid or duplicate shared file.');
  entries[f.path]={sha:f.sha,kind:fileKind(f.path)};
  if(entries[f.path].kind!=='other'&&f.bytes)entries[f.path].bytes=new Uint8Array(f.bytes);
 }
 return {version:1,identity:peerIdentity(repository,branch),commit,entries};
}
export function compareLocal(base,repository,branch,files){
 if(!base||base.version!==1||base.identity!==peerIdentity(repository,branch))return {known:false,changes:[]};
 const current=new Map(files.map(f=>[f.path,f]));const changes=[];
 for(const f of files){const prior=base.entries[f.path];if(prior?.sha!==f.sha)changes.push({path:f.path,kind:fileKind(f.path),change:prior?'modified':'added',baseSha:prior?.sha||null,currentSha:f.sha});}
 for(const [path,f] of Object.entries(base.entries))if(!current.has(path))changes.push({path,kind:f.kind,change:'deleted',baseSha:f.sha,currentSha:null});
 return {known:true,commit:base.commit,changes:changes.sort((a,b)=>a.path.localeCompare(b.path))};
}
export function editOrigin(book,path,previous){
 if(previous?.syncOrigin)return previous.syncOrigin.identity&&previous.syncOrigin.identity!==peerIdentity(book.repository,book.branch)?{version:1,known:false}:previous.syncOrigin;
 const base=book.syncBase;
 const entry=base?.entries[path];
 if(book.syncDetached||!base||base.identity!==peerIdentity(book.repository,book.branch)||!entry?.bytes||(previous?.base&&previous.base!==entry.sha))return {version:1,known:false};
 return {version:1,known:true,identity:base.identity,commit:base.commit,path,sha:entry.sha,bytes:new Uint8Array(entry.bytes)};
}
// localStorage uses JSON, unlike IndexedDB: retain original bytes as ordinary arrays.
export function jsonOrigin(origin){if(!origin.known||origin.contentBase64)return origin;let binary='';for(const b of origin.bytes)binary+=String.fromCharCode(b);const {bytes,...rest}=origin;return {...rest,contentBase64:btoa(binary)};}
