import {readerClient,repositoryName} from './api.js';
import {bookModel,chapterHeadingParts,sceneHeadingParts} from './model.js';
import {readBook,saveBook} from './storage.js';
import {sceneFragmentFromHtml} from './shared/html-format.js';
import {convertItalicMarkers} from './shared/italic-markers.js';
import {keepMarker} from './shared/keep-together.js';
import {fitLayout} from './layout.js';
import {paginate} from './pages.js';
import {mountCards} from './cards.js';
const $=id=>document.getElementById(id);
let snapshot=null,model=null,index=-1,coverUrl='',busy=false,client=null,clientKey='',abort=null,disposeCards=()=>{},readingSource=null;
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function preference(key,value){try{if(value===undefined)return localStorage.getItem('sidecar-reader:'+key);localStorage.setItem('sidecar-reader:'+key,value);}catch{/* Reading remains usable without preferences. */}}
function locationKey(){return snapshot?`${snapshot.repository.toLowerCase()}:${snapshot.branch}`:'';}
function remember(){if(snapshot)preference('position:'+locationKey(),JSON.stringify({chapter:model.chapters[index]?.key??null,y:$('manuscript-scroll').scrollTop}));}
let pageWidth=Math.max(280,Number(preference('page-width'))||740),pageLines=Math.max(15,Math.min(60,Number(preference('page-lines'))||28)),cardMode=preference('card-layout')||'none',dock='';
let layoutTimer,lastPageWidth=0;
function repaginate(){if(!readingSource)return;const scroll=$('manuscript-scroll'),fraction=scroll.scrollTop/Math.max(1,scroll.scrollHeight-scroll.clientHeight);paginate(readingSource,$('reader'),{lines:pageLines,title:model.chapters[index].name});scroll.scrollTop=fraction*Math.max(0,scroll.scrollHeight-scroll.clientHeight);}
function layout(){const available=document.querySelector('.layout').clientWidth;const fit=fitLayout(available,pageWidth,cardMode,Boolean(dock));
  document.documentElement.style.setProperty('--page-width',fit.page+'px');
  for(const [id,width] of [['left-cards',fit.left],['right-cards',fit.right]]){$(id).hidden=!width;$(id).style.width=width+'px';}
  $('right-panel').hidden=!dock;$('right-panel').classList.toggle('overlay',fit.overlay);$('right-panel').style.width=(fit.dock||Math.min(280,available))+'px';
  $('page-width').max=Math.floor(Math.max(1,available-32));$('page-width').value=Math.round(fit.page);$('page-width').min=Math.min(280,fit.page);
  $('width-handle').hidden=dock!=='configuration';
  requestAnimationFrame(()=>{$('width-handle').style.left=($('reader').getBoundingClientRect().right-6)+'px';});
  $('layout-note').textContent=(cardMode!=='none'&&!fit.left?'Cards hidden: there is no usable space beside this page. ':cardMode==='both'&&!fit.right?'Right cards hidden at this width. ':'')+(fit.overlay?'The right panel overlays the page at this width.':'');
  if(lastPageWidth!==fit.page){lastPageWidth=fit.page;clearTimeout(layoutTimer);layoutTimer=setTimeout(repaginate,100);}
}
function setOpen(id,open){if(id==='outline'||id==='configuration'){dock=open?id:'';for(const name of ['outline','configuration']){$(name).hidden=dock!==name;$(name+'-toggle').setAttribute('aria-expanded',String(dock===name));}layout();return;}$(id).hidden=!open;$(id+'-toggle').setAttribute('aria-expanded',String(open));layout();}
$('connection-toggle').onclick=()=>setOpen('connection',$('connection').hidden);
$('outline-toggle').onclick=()=>setOpen('outline',$('outline').hidden);
$('configuration-toggle').onclick=()=>setOpen('configuration',$('configuration').hidden);$('close-panel').onclick=()=>setOpen(dock,false);
$('page-lines').value=pageLines;$('card-layout').value=cardMode;
$('page-lines').onchange=()=>{pageLines=Math.max(15,Math.min(60,Number($('page-lines').value)||28));$('page-lines').value=pageLines;preference('page-lines',String(pageLines));repaginate();};
function resizePage(value){pageWidth=Math.max(Math.min(280,document.querySelector('.layout').clientWidth-32),Math.min(value,document.querySelector('.layout').clientWidth-32));preference('page-width',String(pageWidth));layout();}
$('page-width').onchange=()=>resizePage(Number($('page-width').value)||740);
$('card-layout').onchange=()=>{cardMode=$('card-layout').value;preference('card-layout',cardMode);layout();};
$('width-handle').onpointerdown=event=>{event.preventDefault();const x=event.clientX,start=$('reader').clientWidth;const handle=event.currentTarget;handle.setPointerCapture(event.pointerId);handle.onpointermove=e=>resizePage(start+(e.clientX-x)*2);handle.onpointerup=handle.onlostpointercapture=()=>{handle.onpointermove=null;};};
$('width-handle').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resizePage(Number($('page-width').value)+(e.key==='ArrowLeft'?-10:10));}};
new ResizeObserver(layout).observe(document.querySelector('.layout'));
function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function render(which,scenePath=null,scroll=true){
  index=Math.max(-1,Math.min(model.chapters.length-1,which));const reader=$('reader');reader.replaceChildren();readingSource=null;
  if(index<0){const cover=element('section',undefined,'cover');if(coverUrl){const img=document.createElement('img');img.src=coverUrl;img.alt=`Cover of ${model.title}`;cover.append(img);}else cover.append(element('h1',model.title));if(model.subtitle)cover.append(element('p',model.subtitle));cover.append(element('p',model.author));reader.append(cover);}
  else{
    const chapter=model.chapters[index],heading=chapterHeadingParts(chapter.key);readingSource=element('div');
    if(heading.title)readingSource.append(element('h1',heading.title,'chapter-title'));
    if(heading.subtitle)readingSource.append(element('p',heading.subtitle,'chapter-subtitle'));
    for(const [n,scene] of chapter.scenes.entries()){
      const section=element('section');section.dataset.scene=scene.path;
      if(n)readingSource.append(element('div','* * *','scene-break'));
      const subtitle=sceneHeadingParts(scene.filename).subtitle;if(subtitle){const h=element('h2',subtitle,'scene-subtitle');h.dataset.scene=scene.path;readingSource.append(h);}
      const prose=element('div',undefined,'scene');prose.append(sceneFragmentFromHtml(scene.html));
      convertItalicMarkers(prose,'decode');let group=null;
      for(const block of [...prose.children]){const marker=keepMarker(block.textContent);if(marker){if(marker==='start'){group=element('div',undefined,'keep-unit');group.dataset.scene=scene.path;readingSource.append(group);}else group=null;continue;}
        block.dataset.scene=scene.path;if(block.tagName==='BLOCKQUOTE'){block.classList.add('quote-unit');for(const p of block.children){p.classList.add('quote-line');p.dataset.scene=scene.path;}}
        (group||readingSource).append(block);}
    }
    paginate(readingSource,reader,{lines:pageLines,title:chapter.name});
  }
  $('previous').disabled=index<0;$('next').disabled=index>=model.chapters.length-1;
  $('position').textContent=index<0?model.title:`${index+1} / ${model.chapters.length} · ${model.chapters[index].name}`;
  for(const button of $('outline').querySelectorAll('button')){if(Number(button.dataset.index)===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
  if(scroll){const scroller=$('manuscript-scroll');scroller.scrollTop=0;if(scenePath){const target=[...reader.querySelectorAll('[data-scene]')].find(e=>e.dataset.scene===scenePath);if(target)scroller.scrollTop=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top;}remember();}
}
function openBook(value,resume=true){
  if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl='';snapshot=value;model=bookModel(value);disposeCards();disposeCards=mountCards(value,{left:$('left-cards'),right:$('right-cards')},preference);
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
  if(resume&&saved)requestAnimationFrame(()=>$('manuscript-scroll').scrollTop=Number(saved.y)||0);
}
function navigate(n,path){if(innerWidth<=700)setOpen('outline',false);render(n,path);$('reader').focus({preventScroll:true});}
$('previous').onclick=()=>navigate(index-1);$('next').onclick=()=>navigate(index+1);
let scrollTimer;$('manuscript-scroll').addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,200);},{passive:true});addEventListener('pagehide',remember);
function textSize(value){const size=['18','21','24','28'].includes(value)?value:'21';document.documentElement.style.setProperty('--reading-size',size+'px');$('size').value=size;preference('size',size);}
textSize(preference('size'));$('size').onchange=()=>{textSize($('size').value);repaginate();};
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
