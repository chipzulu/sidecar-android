import {readerClient,repositoryName} from './api.js';
import {bookModel,chapterHeadingParts,sceneHeadingParts} from './model.js';
import {readBook,saveBook} from './storage.js';
import {sceneFragmentFromHtml} from './shared/html-format.js';
import {convertItalicMarkers} from './shared/italic-markers.js';
import {keepMarker} from './shared/keep-together.js';
const $=id=>document.getElementById(id);
let snapshot=null,model=null,index=-1,coverUrl='',busy=false,client=null,clientKey='',abort=null;
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function preference(key,value){try{if(value===undefined)return localStorage.getItem('sidecar-reader:'+key);localStorage.setItem('sidecar-reader:'+key,value);}catch{/* Reading remains usable without preferences. */}}
function locationKey(){return snapshot?`${snapshot.repository.toLowerCase()}:${snapshot.branch}`:'';}
function remember(){if(snapshot)preference('position:'+locationKey(),JSON.stringify({chapter:model.chapters[index]?.key??null,y:scrollY}));}
function setOpen(id,open){$(id).hidden=!open;$(id+'-toggle').setAttribute('aria-expanded',String(open));}
$('connection-toggle').onclick=()=>setOpen('connection',$('connection').hidden);
$('outline-toggle').onclick=()=>setOpen('outline',$('outline').hidden);
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function render(which,scenePath=null,scroll=true){
  index=Math.max(-1,Math.min(model.chapters.length-1,which));const reader=$('reader');reader.replaceChildren();
  if(index<0){const cover=element('section',undefined,'cover');if(coverUrl){const img=document.createElement('img');img.src=coverUrl;img.alt=`Cover of ${model.title}`;cover.append(img);}else cover.append(element('h1',model.title));if(model.subtitle)cover.append(element('p',model.subtitle));cover.append(element('p',model.author));reader.append(cover);}
  else{
    const chapter=model.chapters[index],heading=chapterHeadingParts(chapter.key);
    if(heading.title)reader.append(element('h1',heading.title,'chapter-title'));
    if(heading.subtitle)reader.append(element('p',heading.subtitle,'chapter-subtitle'));
    for(const [n,scene] of chapter.scenes.entries()){
      const section=element('section');section.dataset.scene=scene.path;
      if(n)section.append(element('div','* * *','scene-break'));
      const subtitle=sceneHeadingParts(scene.filename).subtitle;if(subtitle)section.append(element('h2',subtitle,'scene-subtitle'));
      const prose=element('div',undefined,'scene');prose.append(sceneFragmentFromHtml(scene.html));
      for(const p of [...prose.querySelectorAll('p')])if(keepMarker(p.textContent))p.remove();
      convertItalicMarkers(prose,'decode');section.append(prose);reader.append(section);
    }
  }
  $('previous').disabled=index<0;$('next').disabled=index>=model.chapters.length-1;
  $('position').textContent=index<0?model.title:`${index+1} / ${model.chapters.length} · ${model.chapters[index].name}`;
  for(const button of $('outline').querySelectorAll('button')){if(Number(button.dataset.index)===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
  if(scroll){if(scenePath)[...reader.querySelectorAll('[data-scene]')].find(e=>e.dataset.scene===scenePath)?.scrollIntoView({block:'start'});else reader.scrollIntoView({block:'start'});remember();}
}
function openBook(value,resume=true){
  if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl='';snapshot=value;model=bookModel(value);
  if(model.cover){const type=/\.png$/i.test(model.cover.path)?'image/png':'image/jpeg';coverUrl=URL.createObjectURL(new Blob([model.cover.bytes],{type}));}
  document.title=model.title+' · Sidecar Reader';$('repository').value=value.repository;$('branch').value=value.branch;
  $('book-status').textContent=`${model.title} · Offline copy downloaded ${new Date(value.downloadedAt).toLocaleString()} · ${value.commit.slice(0,8)} · ${value.files.length} files`;
  $('outline').replaceChildren();const cover=element('button','Cover');cover.dataset.index='-1';cover.onclick=()=>navigate(-1);$('outline').append(cover);
  model.chapters.forEach((chapter,n)=>{const details=element('details'),summary=element('summary',chapter.name),children=element('div'),all=element('button','Read chapter');all.dataset.index=n;all.onclick=()=>navigate(n);children.append(all);
    for(const scene of chapter.scenes){const button=element('button',scene.name);button.onclick=()=>navigate(n,scene.path);children.append(button);}details.append(summary,children);$('outline').append(details);});
  $('outline-toggle').disabled=false;setOpen('connection',false);
  let saved=null;try{saved=JSON.parse(preference('position:'+locationKey())||'null');}catch{}
  const chosen=resume&&saved?.chapter!==null?model.chapters.findIndex(c=>c.key===saved?.chapter):-1;
  render(chosen,null,false);
  if(resume&&saved)requestAnimationFrame(()=>scrollTo(0,Number(saved.y)||0));
}
function navigate(n,path){if(innerWidth<=700)setOpen('outline',false);render(n,path);$('reader').focus({preventScroll:true});}
$('previous').onclick=()=>navigate(index-1);$('next').onclick=()=>navigate(index+1);
let scrollTimer;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,200);},{passive:true});addEventListener('pagehide',remember);
function textSize(value){const size=['18','21','24','28'].includes(value)?value:'21';document.documentElement.style.setProperty('--reading-size',size+'px');$('size').value=size;preference('size',size);}
textSize(preference('size'));$('size').onchange=()=>textSize($('size').value);
function controls(){for(const id of ['repository','branch','token','download','forget'])$(id).disabled=busy;$('cancel').hidden=!busy;$('progress').hidden=!busy;}
for(const id of ['repository','branch','token'])$(id).oninput=()=>{client=null;clientKey='';};
$('forget').onclick=()=>{client=null;clientKey='';$('token').value='';message('Token forgotten. Your offline book remains available.');};
$('cancel').onclick=()=>abort?.abort();
$('download').onclick=async()=>{
  if(busy)return;busy=true;controls();abort=new AbortController();$('progress').removeAttribute('value');
  try{
    const repository=repositoryName($('repository').value),branch=$('branch').value.trim(),key=JSON.stringify([repository,branch]);
    if(!client||clientKey!==key){client=readerClient(repository,branch,$('token').value);clientKey=key;$('token').value='';}
    if(snapshot&&(repository.toLowerCase()!==snapshot.repository.toLowerCase()||branch!==snapshot.branch)&&!confirm('Replace the offline book on this device with this repository? GitHub files are never changed.')){message('Download cancelled.');return;}
    message('Checking private repository and latest backup…');
    // Pass cancellation into the GET-only transport; token stays in its closure.
    const next=await client.download(snapshot,p=>{if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');$('progress').max=Math.max(1,p.total);$('progress').value=p.completed;message(`Downloading ${p.completed} of ${p.total} files · ${p.path}`);},abort.signal);
    if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');
    const verified=bookModel(next);if(!verified.chapters.length)throw Error('No readable manuscript found.');
    await saveBook(next);remember();openBook(next);message('Book verified and saved for offline reading. No GitHub files were changed.');
    navigator.storage?.persist?.().catch(()=>{});
  }catch(error){message(error.message,true);setOpen('connection',true);}finally{busy=false;controls();abort=null;}
};
try{const saved=await readBook();if(saved)openBook(saved);}catch(error){message(error.message,true);}
if('serviceWorker'in navigator&&isSecureContext){try{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline').textContent='Reader cached for offline opening. Use Chrome → Install app / Add to Home screen.';}catch{$('offline').textContent='Offline app setup failed. Reopen online and try again.';}}else $('offline').textContent='Open this app from an HTTPS website to enable offline installation.';
