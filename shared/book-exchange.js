// Version one uses the same stored ZIP entries as the DOCX and EPUB writers.
const decoder = new TextDecoder('utf-8',{fatal:true});
const manifestPath = 'sidecar-exchange.json';
const limit = 100 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const invalid = () => Error('This file is damaged or is not a supported Sidecar book.');
function checkPath(path) {
  if(typeof path!=='string'||!path.startsWith('Book/')||path.length>4096||
     path.split('/').some(p=>!p||p==='.'||p==='..'||p.toLowerCase()==='.git'||/[\\:\x00-\x1f]/.test(p)))throw invalid();
}
async function hash(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function requireScene(files) {
  if(!files.some(f=>/^Book\/Chapters\/.+\.html?$/i.test(f.path)&&!f.path.split('/').slice(2,-1).some(p=>p.toLowerCase()==='notes')))throw Error('The book contains no manuscript scenes.');
}
export async function packBook(book,bookId,title,zipFiles) {
  if(!uuid.test(bookId))throw Error('Reopen this book from the bookshelf before exporting.');
  const entries=[],files=[],directories=[];
  let total=0;
  async function walk(dir,prefix){
    for await(const item of dir.values()){
      if(item.name.toLowerCase()==='.git')continue;
      const path=prefix+'/'+item.name;checkPath(path);
      if(files.length+directories.length>=10000)throw Error('The exchange limit is 10,000 entries.');
      if(item.kind==='directory'){directories.push(path);await walk(item,path);continue;}
      const file=await item.getFile();
      total+=file.size;
      if(total>limit)throw Error('The book exceeds the 100 MiB exchange limit.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      files.push({path,size:bytes.length,hash:await hash(bytes)});entries.push([path,bytes]);
    }
  }
  await walk(book,'Book');requireScene(files);
  files.sort((a,b)=>a.path<b.path?-1:1);directories.sort();
  const manifest={format:'story-sidecar-book',version:1,bookId,title,directories,files};
  entries.unshift([manifestPath,JSON.stringify(manifest)]);
  return zipFiles(entries);
}
async function readPackage(file) {
  if(file.size>limit+12*1024*1024)throw Error('This exchange file exceeds the Reader limit.');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  const u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
  const end=bytes.length-22;
  if(end<0||u32(end)!==0x06054b50||u32(end+16)+u32(end+12)!==end)throw invalid();
  let central=u32(end+16),offset=0;
  const count=u16(end+10),entries=new Map();
  if(count>10001)throw invalid();
  for(let i=0;i<count;i++){
    if(central+46>end||u32(central)!==0x02014b50||u16(central+10)!==0||u32(central+42)!==offset||
       offset+30>central||u32(offset)!==0x04034b50||u16(offset+8)!==0)throw invalid();
    const len=u16(central+28),name=decoder.decode(bytes.subarray(central+46,central+46+len));
    const start=offset+30+u16(offset+26)+u16(offset+28),size=u32(central+24);
    if(size!==u32(central+20)||start+size>u32(end+16)||name!==decoder.decode(bytes.subarray(offset+30,offset+30+u16(offset+26)))||entries.has(name))throw invalid();
    if(name!==manifestPath)checkPath(name);
    entries.set(name,bytes.subarray(start,start+size));offset=start+size;
    central+=46+len+u16(central+30)+u16(central+32);
  }
  if(central!==end||offset!==u32(end+16)||!entries.has(manifestPath))throw invalid();
  const raw=entries.get(manifestPath),m=JSON.parse(decoder.decode(raw));entries.delete(manifestPath);
  return {raw,m,entries};
}
export async function unpackBook(file) {
  const {raw,m,entries}=await readPackage(file);
  if(m.format!=='story-sidecar-book'||m.version!==1||!uuid.test(m.bookId)||typeof m.title!=='string'||!m.title.trim()||
     !Array.isArray(m.directories)||!Array.isArray(m.files)||entries.size!==m.files.length||m.files.length+m.directories.length>10000)throw invalid();
  m.directories.forEach(checkPath);
  const files=[];
  for(const f of m.files){
    const data=entries.get(f.path);
    if(!data||data.length!==f.size||await hash(data)!==f.hash)throw invalid();
    entries.delete(f.path);files.push({path:f.path,bytes:data.slice()});
  }
  requireScene(files);
  return {exchangeId:m.bookId,exchangeRevision:await hash(raw),directories:m.directories,title:m.title,files};
}

function returnPath(path){
  checkPath(path);
  if(path.split('/').some(p=>p.startsWith('.')||/[. ]$/.test(p)||/[<>*?"|]/.test(p)))throw invalid();
  if(path.split('/').some(p=>/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)))throw invalid();
  if(!(/^Book\/Chapters\/.+\.html?$/i.test(path)&&!path.split('/').slice(2,-1).some(p=>p.toLowerCase()==='notes')) &&
     !/^Book\/Notes\/(?:Highlight |Converted draft )[a-f0-9-]{36}\.md$/.test(path))throw invalid();
}
export async function packReturn(book,changed,zipFiles){
  const originals=new Map(book.files.map(f=>[f.path,f]));
  const files=[],entries=[];
  if(changed.length>10000||changed.reduce((n,f)=>n+f.bytes.length,0)>limit)throw Error('The return exceeds the 100 MiB or 10,000 file limit.');
  for(const f of changed){
    returnPath(f.path);
    const before=originals.get(f.path);
    files.push({path:f.path,base:before?.sha||null,size:f.bytes.length,hash:await hash(f.bytes)});
    entries.push([f.path,f.bytes]);
  }
  if(!files.length)throw Error('No saved tablet changes to return.');
  const manifest={format:'story-sidecar-return',version:1,bookId:book.exchangeId,startingRevision:book.exchangeRevision,files:files.sort((a,b)=>a.path<b.path?-1:1)};
  return zipFiles([[manifestPath,JSON.stringify(manifest)],...entries]);
}
export async function unpackReturn(file,bookId){
  const {raw,m,entries}=await readPackage(file);
  if(m.format!=='story-sidecar-return'||m.version!==1||!uuid.test(m.bookId)||!Array.isArray(m.files)||!m.files.length||m.files.length!==entries.size||!/^[a-f0-9]{64}$/.test(m.startingRevision))throw invalid();
  if(m.bookId!==bookId)throw Error('This return belongs to a different book. Open its original PC project.');
  const files=[],names=new Set();
  for(const f of m.files){
    returnPath(f.path);
    const key=f.path.toLowerCase(),bytes=entries.get(f.path);
    if(names.has(key)||!bytes||bytes.length!==f.size||await hash(bytes)!==f.hash||(f.base!==null&&!/^[a-f0-9]{40}$/.test(f.base)))throw invalid();
    if(f.base===null&&/^Book\/Chapters\//i.test(f.path))throw invalid();
    names.add(key);files.push({path:f.path,bytes,base:f.base});
  }
  return {id:await hash(raw),files};
}
