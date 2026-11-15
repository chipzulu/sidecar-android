import {decodeNote,isHighlightFile} from './annotation-brush.js';

// Keep the tablet inbox on its own branch so ordinary book backups keep their
// existing conflict checks and a tablet never changes the backed-up manuscript.
export function annotationInbox(repository,branch,token,fetcher=fetch) {
  const inbox='sidecar-highlights/'+branch, root='https://api.github.com/repos/'+repository;
  async function request(path,method='GET',body,missing=false){
    const response=await fetcher(root+path,{method,credentials:'omit',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(45000),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})});
    if(missing&&response.status===404)return null;
    if(!response.ok)throw Error(response.status===403?'GitHub denied access. Sending highlights requires Contents read and write.':
      response.status===409||response.status===422?'GitHub changed during transfer. Your tablet copy is kept. Send again to review the current version.':'Highlight transfer failed (GitHub '+response.status+').');
    return response.json();
  }
  async function head(ref){return request('/git/ref/heads/'+encodeURIComponent(ref),'GET',null,true);}
  async function privateRepo(){if(!(await request('')).private)throw Error('Choose a private repository.');}
  async function list(){
    await privateRepo();
    const ref=await head(inbox);if(!ref)return [];
    const commit=await request('/git/commits/'+ref.object.sha);
    const tree=await request('/git/trees/'+commit.tree.sha);
    const folder=tree.tree.find(e=>e.path==='SidecarHighlights'&&e.type==='tree');if(!folder)return [];
    const files=await request('/git/trees/'+folder.sha);
    if(files.truncated)throw Error('Incomplete annotation inbox.');
    const result=[];
    for(const entry of files.tree.filter(e=>e.mode==='100644'&&isHighlightFile(e.path))){
      if(entry.size>1024*1024)throw Error('Annotation file is too large.');
      const data=await request('/git/blobs/'+entry.sha);
      const text=new TextDecoder().decode(Uint8Array.from(atob(data.content),c=>c.charCodeAt(0)));
      const note=decodeNote(text);if(!note||entry.path!=='Highlight '+note.id+'.md')throw Error('Invalid highlight file in the inbox.');
      result.push({name:entry.path,sha:entry.sha,text,note});
    }
    return result;
  }
  async function send(name,text,expected){
    if(!isHighlightFile(name)||!decodeNote(text))throw Error('Invalid highlight note.');
    await privateRepo();
    if(!await head(inbox)){
      const source=await head(branch);if(!source)throw Error('Book branch not found.');
      await request('/git/refs','POST',{ref:'refs/heads/'+inbox,sha:source.object.sha});
    }
    const path='/contents/SidecarHighlights/'+encodeURIComponent(name);
    const existing=await request(path+'?ref='+encodeURIComponent(inbox),'GET',null,true);
    const bytes=new TextEncoder().encode(text);
    if(bytes.length>1024*1024)throw Error('Annotation file is too large.');
    let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
    const content=btoa(binary);
    if(existing?.content?.replace(/\s/g,'')===content)return existing.sha;
    if(existing){
      let remote;try{remote=decodeNote(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(existing.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}catch{}
      if(!remote||'Highlight '+remote.id+'.md'!==name)throw Error('GitHub annotation could not be verified. Your tablet copy is still saved.');
      // Base is transport bookkeeping, not authored content. Equal content recovers a lost receipt.
      const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
      const authored=note=>{const {base,...content}=note;return JSON.stringify(stable(content));};
      if(authored(remote)===authored(decodeNote(text)))return existing.sha;
      if(existing.sha!==expected){const error=Error('The GitHub annotation differs from the tablet copy. Its saved upload receipt is missing or out of date.');error.code='ANNOTATION_CONFLICT';error.remote={note:remote,sha:existing.sha};throw error;}
    }
    const saved=await request(path,'PUT',{branch:inbox,message:'Update '+name,content,...(existing?{sha:existing.sha}:{})});
    return saved.content.sha;
  }
  return {list,send};
}
