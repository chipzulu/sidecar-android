// GitHub-only backup transport. Tokens remain in the caller's closure.
import {annotationInbox} from './annotation-inbox.js';
export function parseGitCard(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#') || line.trim().startsWith('```')) continue;
    const match = line.match(/^\s*(repository|branch|username)\s*:\s*(.*?)\s*$/i);
    if (!match) throw new Error('Git.md accepts only repository, branch and username. Remove passwords/tokens from the card and revoke any exposed credential.');
    const key = match[1].toLowerCase();
    if (key in fields) throw new Error(`Duplicate ${key} in Git.md.`);
    fields[key] = match[2];
  }
  const repository = (fields.repository || '').replace(/^https:\/\/github\.com\//i, '').replace(/\/$/,'').replace(/\.git$/,'');
  if (!/^[a-z\d-]+\/[a-z\d_.-]+$/i.test(repository)) throw new Error('Git.md needs repository: https://github.com/OWNER/REPOSITORY');
  const branch = fields.branch || 'main';
  if (!branch || /[\s~^:?*\[\\]/.test(branch) || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) throw new Error('Invalid branch in Git.md.');
  return {repository, branch};
}
export async function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const input = new Uint8Array(header.length + bytes.length); input.set(header); input.set(bytes,header.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',input)),b=>b.toString(16).padStart(2,'0')).join('');
}
function base64(bytes) {
  let binary=''; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export async function readGitCard(book) {
  try { return parseGitCard(await (await (await (await book.getDirectoryHandle('Cards')).getFileHandle('Git.md')).getFile()).text()); }
  catch(error) { if(error.name==='NotFoundError') throw new Error('Create Book/Cards/Git.md with repository and branch, then Connect.'); throw error; }
}
export function checkBackupInventory(files) {
  const mib = bytes => (bytes / (1024 * 1024)).toFixed(1) + ' MiB';
  const total=files.reduce((sum,file)=>sum+file.size,0);
  const oversized=files.filter(file=>file.size>25*1024*1024);
  const reasons=[];
  if(oversized.length)reasons.push(`${oversized.length} file(s) exceed Sidecar's 25 MiB per-file limit.`);
  if(total>100*1024*1024)reasons.push(`Book totals ${mib(total)}; Sidecar's snapshot limit is 100 MiB.`);
  if(files.length>10000)reasons.push(`Book contains ${files.length.toLocaleString()} files; Sidecar's limit is 10,000.`);
  if(!reasons.length)return;
  const largest=[...files].sort((a,b)=>b.size-a.size).slice(0,5).map(file=>`${file.path} — ${mib(file.size)}`);
  throw new Error(`Backup stopped before upload. ${reasons.join(' ')}\n\nLargest files:\n${largest.join('\n')}\n\nNo files were moved or excluded. These are Sidecar limits, not a GitHub login error.`);
}
export async function captureBook(book) {
  const config=await readGitCard(book), files=[];
  async function walk(dir, prefix) {
    for await(const entry of dir.values()) {
      if (entry.name.toLowerCase()==='.git' || ['.DS_Store','Thumbs.db','desktop.ini'].includes(entry.name)) continue;
      const path=prefix+'/'+entry.name;
      if(entry.kind==='directory') {await walk(entry,path);continue;}
      const file=await entry.getFile();
      files.push({path,handle:entry,size:file.size,modified:file.lastModified});
    }
  }
  await walk(book,'Book');
  checkBackupInventory(files);
  for(const file of files) {
    const current=await file.handle.getFile();
    if(current.size!==file.size || current.lastModified!==file.modified)throw new Error('Book changed while preparing backup. Try again.');
    file.bytes=new Uint8Array(await current.arrayBuffer());file.sha=await gitBlobSha(file.bytes);
  }
  // Detect external writes during capture. Editor saves/structural actions are paused by caller.
  for(const file of files) { const current=await file.handle.getFile(); if(current.size!==file.size || current.lastModified!==file.modified) throw new Error('Book changed while preparing backup. Try again.'); }
  const capturedConfig=files.find(file=>file.path==='Book/Cards/Git.md');
  if(!capturedConfig)throw new Error('Git.md was removed during preparation. Try again.');
  const finalConfig=parseGitCard(new TextDecoder().decode(capturedConfig.bytes));
  if(JSON.stringify(finalConfig)!==JSON.stringify(config))throw new Error('Git.md changed during preparation. Try again.');
  return {config:finalConfig,files:files.sort((a,b)=>a.path.localeCompare(b.path)).map(({path,sha,bytes})=>({path,sha,bytes}))};
}
export function githubBackupClient(config, token, {fetcher=fetch, signal}={}) {
  // Revalidate even if the caller did not obtain its settings from a card.
  const safe=parseGitCard(`repository: ${config.repository}\nbranch: ${config.branch}`);
  if(!token.trim()) throw new Error('Enter a fine-grained GitHub token.');
  const root=`https://api.github.com/repos/${safe.repository}`;
  async function api(path,method='GET',body) {
    if(signal?.aborted) throw new Error('Backup cancelled.');
    let response;
    try {response=await fetcher(root+path,{method,credentials:'omit',redirect:'error',cache:'no-store',signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token.trim()}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
    catch {throw new Error(signal?.aborted?'Backup cancelled.':'GitHub connection failed. No upload is confirmed; reconnect and retry safely.');}
    if(!response.ok) {
      const errors={401:'Token expired or invalid.',403:'GitHub denied access or rate limited the request. Check token permissions.',404:'Repository or branch not found, or token cannot access it. Create the private repository with a README first.',409:'GitHub changed or cannot accept this commit. No force overwrite was attempted.',422:'GitHub refused the update. The branch may have changed or be protected.'};
      const error=new Error(errors[response.status] || `GitHub returned HTTP ${response.status}.`);error.status=response.status;throw error;
    }
    return response.json();
  }
  async function inspect() {
    const repo=await api(''); if(repo.private!==true) throw new Error('Backup requires a PRIVATE GitHub repository.');
    const ref=await api(`/git/ref/heads/${encodeURIComponent(safe.branch)}`);
    const commit=await api(`/git/commits/${ref.object.sha}`);
    const tree=await api(`/git/trees/${commit.tree.sha}?recursive=1`);
    if(tree.truncated)throw new Error('Remote tree is too large to verify safely.');
    return {head:ref.object.sha,tree:commit.tree.sha,entries:tree.tree};
  }
  async function download(progress=()=>{},cached=[]) {
    const remote=await inspect();
    const entries=remote.entries.filter(e=>e.path.startsWith('Book/')&&e.type!=='tree');
    const names=new Set();
    for(const e of entries){
      const parts=e.path.split('/');
      if(e.type!=='blob'||e.mode!=='100644'||parts.some(p=>!p||p==='.'||p==='..'||p.toLowerCase()==='.git'||/[\\:*?"<>|\x00-\x1f]/.test(p)||/[. ]$/.test(p))||names.has(e.path.toLowerCase()))throw Error('Unsupported or ambiguous remote Book path: '+e.path);
      names.add(e.path.toLowerCase());
    }
    checkBackupInventory(entries.map(e=>({...e,size:e.size||0})));
    const files=new Array(entries.length),cache=new Map(cached.map(f=>[f.sha,f.bytes]));let total=0,cursor=0,completed=0;
    async function worker(){while(cursor<entries.length){const index=cursor++,entry=entries[index];let bytes=cache.get(entry.sha);
      if(!bytes){const blob=await api('/git/blobs/'+entry.sha);if(blob.encoding!=='base64')throw Error('Unsupported remote blob encoding.');bytes=Uint8Array.from(atob(blob.content.replace(/\s/g,'')),c=>c.charCodeAt(0));}
      total+=bytes.length;if(bytes.length>25*1024*1024||total>100*1024*1024)throw Error('Remote book exceeds the transfer size limit.');
      if(await gitBlobSha(bytes)!==entry.sha)throw Error('Remote file verification failed: '+entry.path);
      files[index]={path:entry.path,sha:entry.sha,bytes,size:bytes.length};completed++;progress({completed,total:entries.length,path:entry.path});
    }}
    await Promise.all(Array.from({length:Math.min(4,entries.length)},worker));
    if(!files.some(f=>/^Book\/Chapters\/.+\.html?$/i.test(f.path)))throw Error('No manuscript scenes found in the remote book.');
    return {...remote,files};
  }
  function plan(remote,files,previous) {
    const entries=remote.entries.filter(e=>e.path==='Book'||e.path.startsWith('Book/'));
    if(entries.some(e=>e.type!=='tree' && (e.type!=='blob'||e.mode!=='100644')))throw new Error('Remote Book contains unsupported links or file modes. Use a dedicated book repository.');
    const old=new Map(entries.filter(e=>e.type==='blob').map(e=>[e.path,e.sha]));
    const current=new Map(files.map(f=>[f.path,f.sha]));
    const changed=files.filter(f=>old.get(f.path)!==f.sha);
    const deleted=[...old.keys()].filter(path=>!current.has(path));
    // Identical content safely recovers from a successful upload with a lost response.
    if(!changed.length && !deleted.length)return {changed,deleted,unchanged:true};
    if(previous && previous.head!==remote.head)throw new Error('Remote changes detected. Backup stopped; local files and GitHub are unchanged. Get latest is not available yet.');
    if(!previous && entries.length)throw new Error('This repository already contains a different Book folder. Use a new private repository; Sidecar will not overwrite it.');
    return {changed,deleted,unchanged:false};
  }
  async function upload(remote,files,previous,progress=()=>{}) {
    const work=plan(remote,files,previous);
    if(work.unchanged)return {head:remote.head,uploaded:false};
    const tree=[]; let completed=0;
    for(const file of work.changed) {
      progress({completed,total:work.changed.length,path:file.path});
      // Batch ordinary prose/cards in the tree request, avoiding hundreds of
      // content-creation API calls for a large novel's initial backup.
      if (/\.(?:html?|md|txt|json|csv|ya?ml)$/i.test(file.path)) {
        let content;try {content=new TextDecoder('utf-8',{fatal:true}).decode(file.bytes);}catch { /* Preserve non-UTF-8 bytes through the blob endpoint. */ }
        if(content!==undefined && !content.includes('\0') && !(file.bytes.length>=3 && file.bytes.slice(0,3).every((b,i)=>b===[239,187,191][i]))) {
          tree.push({path:file.path,mode:'100644',type:'blob',content});completed++;continue;
        }
      }
      const blob=await api('/git/blobs','POST',{encoding:'base64',content:base64(file.bytes)});
      if(blob.sha!==file.sha)throw new Error('GitHub returned an unexpected file hash. Backup stopped.');
      tree.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});completed++;
    }
    for(const path of work.deleted)tree.push({path,mode:'100644',type:'blob',sha:null});
    progress({completed,total:work.changed.length,path:'Committing book snapshot…'});
    const newTree=await api('/git/trees','POST',{base_tree:remote.tree,tree});
    const commit=await api('/git/commits','POST',{message:`Story Sidecar backup: ${work.changed.length} updated, ${work.deleted.length} removed`,tree:newTree.sha,parents:[remote.head]});
    // A concurrent commit makes this non-fast-forward and GitHub refuses it.
    await api(`/git/refs/heads/${encodeURIComponent(safe.branch)}`,'PATCH',{sha:commit.sha,force:false});
    return {head:commit.sha,uploaded:true};
  }
  return {inspect,download,plan,upload,inbox:annotationInbox(safe.repository,safe.branch,token,fetcher)};
}
