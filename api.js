import {annotationInbox} from './shared/annotation-inbox.js';
export function repositoryName(value) {
  const name=value.trim().replace(/^https:\/\/github\.com\//i,'').replace(/\/$/,'').replace(/\.git$/,'');
  if(!/^[a-z\d-]+\/[a-z\d_.-]+$/i.test(name)||['.','..'].includes(name.split('/')[1]))throw Error('Enter OWNER/REPOSITORY or its GitHub HTTPS address.');
  return name;
}
export async function blobSha(bytes) {
  const header=new TextEncoder().encode(`blob ${bytes.length}\0`),buffer=new Uint8Array(header.length+bytes.length);buffer.set(header);buffer.set(bytes,header.length);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-1',buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function readerClient(repository,branch,token,{fetcher=fetch,signal}={}) {
  let activeSignal=signal;
  const name=repositoryName(repository);if(!branch.trim())throw Error('Enter a branch, usually main.');if(!token.trim())throw Error('Enter a read-only GitHub token.');
  const credential=token.trim();
  if(/[^!-~]/.test(credential))throw Error('The pasted token contains a space, line break, or unusual character. Copy the token again.');
  async function get(path){
    const parent=activeSignal, controller=new AbortController();
    const cancel=()=>controller.abort();
    if(parent?.aborted)cancel();
    parent?.addEventListener('abort',cancel,{once:true});
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;cancel();},45000);
    try{
      let response;
      try{
        response=await fetcher(`https://api.github.com/repos/${name}${path}`,{
          method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
          headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+credential}
        });
      }catch{
        throw Error(globalThis.navigator?.onLine===false?'The tablet is offline. Reconnect to Wi-Fi and retry.':'The browser could not connect to api.github.com. Open https://api.github.com in Chrome on this tablet to check the connection.');
      }
      if(!response.ok)throw Error(({401:'Token expired or invalid.',403:'GitHub denied access or rate limited requests. Check read permission or try later.',404:'Private repository or branch not found. Check the address and token access.'})[response.status]||`GitHub returned HTTP ${response.status}.`);
      return await response.json();
    }catch(error){
      if(parent?.aborted)throw Error('Download cancelled. Your previous offline book is retained.');
      if(timedOut)throw Error('GitHub took more than 45 seconds to respond. Retry the download.');
      throw error;
    }finally{clearTimeout(timer);parent?.removeEventListener('abort',cancel);}
  }
  async function download(previous,progress=()=>{},downloadSignal=signal) {
    activeSignal=downloadSignal;
    const repo=await get('');if(repo.private!==true)throw Error('Use a PRIVATE book repository for this reader.');
    const ref=await get(`/git/ref/heads/${encodeURIComponent(branch)}`),commit=await get(`/git/commits/${ref.object.sha}`),tree=await get(`/git/trees/${commit.tree.sha}?recursive=1`);
    if(tree.truncated)throw Error('GitHub returned an incomplete file list. Previous book retained.');
    const entries=tree.tree.filter(e=>e.path.startsWith('Book/')&&!e.path.split('/').some(part=>part.toLowerCase()==='.git')&&e.type!=='tree');
    if(entries.some(e=>e.type!=='blob'||e.mode!=='100644'||e.path.split('/').some(p=>['.','..',''].includes(p))))throw Error('Unsupported file paths or links in the book.');
    if(entries.length>10000||entries.some(e=>e.size>25*1024*1024)||entries.reduce((n,e)=>n+(e.size||0),0)>100*1024*1024)throw Error('Reader limit: 25 MiB per file, 100 MiB per book, 10,000 files. Previous book retained.');
    if(!entries.some(e=>/^Book\/Chapters\/.+\.html?$/i.test(e.path)&&!e.path.split('/').slice(2,-1).some(p=>p.toLowerCase()==='notes')))throw Error('No manuscript scenes found under Book/Chapters. Send a desktop Sidecar backup first.');
    const cache=new Map((previous?.repository.toLowerCase()===name.toLowerCase()&&previous?.branch===branch?previous.files:[]).map(f=>[f.sha,f.bytes]));
    const priority=e=>/Book\/Cards\/cover\.(png|jpe?g)$/i.test(e.path)?0:e.path.startsWith('Book/Chapters/')?1:2;
    entries.sort((a,b)=>priority(a)-priority(b));
    const files=new Array(entries.length),pending=new Map();let completed=0,total=0,cursor=0,failure=null;
    async function worker(){while(!failure&&cursor<entries.length){const slot=cursor++,entry=entries[slot];try{
      if(activeSignal?.aborted)throw Error('Download cancelled. Previous offline book retained.');
      progress({completed,total:entries.length,path:entry.path});let bytes=cache.get(entry.sha);
      if(!bytes){if(!pending.has(entry.sha))pending.set(entry.sha,(async()=>{const blob=await get(`/git/blobs/${entry.sha}`);if(blob.encoding!=='base64')throw Error('Unsupported GitHub file encoding.');return Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0));})());bytes=await pending.get(entry.sha);}
      total+=bytes.length;if(bytes.length>25*1024*1024||total>100*1024*1024)throw Error('Downloaded book exceeds the reader size limit.');
      if(await blobSha(bytes)!==entry.sha)throw Error(`File verification failed: ${entry.path}. Previous offline book retained.`);
      cache.set(entry.sha,bytes);files[slot]={path:entry.path,sha:entry.sha,bytes};completed++;
      progress({completed,total:entries.length,path:entry.path});
    }catch(error){failure ||= error;}}}
    await Promise.all(Array.from({length:Math.min(4,entries.length)},()=>worker()));
    if(failure)throw failure;
    progress({completed,total:entries.length,path:'Saving verified offline copy…'});
    return {repository:name,branch,commit:ref.object.sha,downloadedAt:new Date().toISOString(),files};
  }
  return {download,inbox:annotationInbox(name,branch,token,fetcher)};
}
