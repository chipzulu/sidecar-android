import {readerClient,repositoryName} from './api.js';
import {bookModel,chapterHeadingParts,sceneHeadingParts} from './model.js';
import {readBook,saveBook} from './storage.js';
import {sceneFragmentFromHtml} from './shared/html-format.js';
import {convertItalicMarkers} from './shared/italic-markers.js';
import {keepMarker} from './shared/keep-together.js';
import {fitLayout} from './layout.js';
import {paginate} from './pages.js';
import {mountCards} from './cards.js';
import {mountCredentials} from './credentials-ui.js';
import {readDraft, writeScene} from './writing.js';
import {mountHighlights} from './highlights.js';
const $=id=>document.getElementById(id);
let snapshot=null,model=null,index=-1,coverUrl='',busy=false,credentialBusy=false,client=null,clientKey='',abort=null,disposeCards=()=>{},selectedScene=null,renderRevision=0,rendering=false;
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
const highlights=mountHighlights({reader:$('reader'),viewport:$('manuscript-scroll'),status:message});
function preference(key,value){try{if(value===undefined)return localStorage.getItem('sidecar-reader:'+key);localStorage.setItem('sidecar-reader:'+key,value);}catch{/* Reading remains usable without preferences. */}}
function locationKey(){return snapshot?`${snapshot.repository.toLowerCase()}:${snapshot.branch}`:'';}
function remember(){if(snapshot&&!rendering)preference('position:'+locationKey(),JSON.stringify({scope:index===-2?'novel':selectedScene?'scene':index===-1?'cover':'chapter',chapter:model.chapters[index]?.key??null,scene:selectedScene,y:$('manuscript-scroll').scrollTop}));}
let pageWidth=Math.max(280,Number(preference('page-width'))||740),pageLines=Math.max(15,Math.min(60,Number(preference('page-lines'))||28)),cardMode=preference('card-layout')||'none',dock='';
let layoutTimer,lastPageWidth=0;
function repaginate(){if(!model||index===-1)return;return render(index,selectedScene,false,true);}
function layout(){const available=document.querySelector('.layout').clientWidth;const fit=fitLayout(available,pageWidth,cardMode,Boolean(dock));
  document.documentElement.style.setProperty('--page-width',fit.page+'px');
  for(const [id,width] of [['left-cards',fit.left],['right-cards',fit.right]]){$(id).hidden=!width;$(id).style.width=width+'px';}
  const edge=(available-fit.page-32)/2;
  $('left-cards').style.left=Math.max(0,edge-fit.left)+'px';$('right-cards').style.left=(available-edge)+'px';
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
function chapterSource(chapter,scenePath){
    const heading=chapterHeadingParts(chapter.key),source=element('div');
    if(!scenePath&&heading.title)source.append(element('h1',heading.title,'chapter-title'));
    if(!scenePath&&heading.subtitle)source.append(element('p',heading.subtitle,'chapter-subtitle'));
    const scenes=scenePath?chapter.scenes.filter(scene=>scene.path===scenePath):chapter.scenes;
    for(const [n,scene] of scenes.entries()){
      if(n)source.append(element('div','* * *','scene-break'));
      const subtitle=sceneHeadingParts(scene.filename).subtitle;if(subtitle){const h=element('h2',subtitle,'scene-subtitle');h.dataset.scene=scene.path;source.append(h);}
      const prose=element('div',undefined,'scene');prose.append(sceneFragmentFromHtml(scene.html));
      convertItalicMarkers(prose,'decode');let group=null;
      for(const [blockIndex,block] of [...prose.children].entries()){block.dataset.block=String(blockIndex);const marker=keepMarker(block.textContent);if(marker){if(marker==='start'){group=element('div',undefined,'keep-unit');group.dataset.scene=scene.path;source.append(group);}else group=null;continue;}
        block.dataset.scene=scene.path;if(block.tagName==='BLOCKQUOTE'){block.classList.add('quote-unit');for(const p of block.children){p.dataset.block=String(blockIndex);p.classList.add('quote-line');p.dataset.scene=scene.path;}}
        (group||source).append(block);}
    }
    return source;
}
function pageStatus(){
  if(rendering)return;const pages=[...$('reader').querySelectorAll('.reading-page')];if(!pages.length){$('page-count').textContent='';return;}
  const top=$('manuscript-scroll').getBoundingClientRect().top;
  const current=Math.max(0,pages.findIndex(page=>page.getBoundingClientRect().bottom>top+1));
  $('page-count').textContent=`Page ${current+1} / ${pages.length} · estimate`;
  if(index===-2){$('previous').disabled=current===0;$('next').disabled=current===pages.length-1;}
}
async function render(which,scenePath=null,scroll=true,preserve=false){
  const revision=++renderRevision,scroller=$('manuscript-scroll'),fraction=scroller.scrollTop/Math.max(1,scroller.scrollHeight-scroller.clientHeight);
  index=which===-2?-2:Math.max(-1,Math.min(model.chapters.length-1,which));selectedScene=index>=0&&model.chapters[index].scenes.some(s=>s.path===scenePath)?scenePath:null;
  $('highlight-toggle').hidden=index===-1;$('edit-scene').hidden=index===-1;const reader=$('reader');reader.replaceChildren();rendering=true;reader.setAttribute('aria-busy','true');
  const name=index===-2?'Entire Novel':index===-1?model.title:selectedScene?model.chapters[index].scenes.find(s=>s.path===selectedScene).name:model.chapters[index].name;
  for(const [id,direction] of [['previous','Previous'],['next','Next']]){const label=`${direction} ${index===-2?'page':selectedScene?'scene':'chapter'}`;$(id).title=label;$(id).setAttribute('aria-label',label);}
  $('position').textContent=name;$('position').title=name;$('page-count').textContent=index===-1?'':'Estimating pages…';
  $('previous').disabled=true;$('next').disabled=true;
  const key=index===-2?'novel':index===-1?'cover':selectedScene||`chapter:${model.chapters[index].key}`;
  for(const button of $('outline').querySelectorAll('button')){if(button.dataset.scope===key)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
  try{
    if(index===-1){const cover=element('section',undefined,'cover');if(coverUrl){const img=document.createElement('img');img.src=coverUrl;img.alt=`Cover of ${model.title}`;cover.append(img);}else cover.append(element('h1',model.title));if(model.subtitle)cover.append(element('p',model.subtitle));cover.append(element('p',model.author));reader.append(cover);}
    else{
      const chapters=index===-2?model.chapters:[model.chapters[index]];let count=0;
      for(const chapter of chapters){
        if(revision!==renderRevision)return;
        const host=element('section',undefined,'chapter-pages');host.dataset.chapter=chapter.key;reader.append(host);
        count+=paginate(chapterSource(chapter,selectedScene),host,{lines:pageLines,title:chapter.name,startPage:count});
        if(chapters.length>1){$('page-count').textContent=`Estimating… ${count} pages`;await new Promise(requestAnimationFrame);}
      }
    }
    if(revision!==renderRevision)return;
    if(preserve)scroller.scrollTop=fraction*Math.max(0,scroller.scrollHeight-scroller.clientHeight);else if(scroll)scroller.scrollTop=0;
    $('previous').disabled=index===-1;$('next').disabled=index>=model.chapters.length-1&&!selectedScene;
    if(selectedScene){const all=model.chapters.flatMap(c=>c.scenes);const sceneIndex=all.findIndex(s=>s.path===selectedScene);$('previous').disabled=sceneIndex===0;$('next').disabled=sceneIndex===all.length-1;}
  }catch(error){if(revision===renderRevision){$('page-count').textContent='Page estimate unavailable';message(error.message,true);setOpen('connection',true);}}
  finally{if(revision===renderRevision){rendering=false;reader.setAttribute('aria-busy','false');pageStatus();remember();highlights.rebuild();}}
}
let tappedBlock=null;
$('reader').addEventListener('click',event=>{tappedBlock=event.target.closest('[data-block]');});
$('edit-scene').onclick=()=>{
  if(rendering||busy)return;
  const viewport=$('manuscript-scroll').getBoundingClientRect();
  const visible=node=>node.getBoundingClientRect().bottom>viewport.top&&node.getBoundingClientRect().top<viewport.bottom;
  const blocks=[...$('reader').querySelectorAll('[data-block]')];
  const anchor=tappedBlock?.isConnected&&visible(tappedBlock)?tappedBlock:blocks.find(visible)||blocks[0];
  const path=anchor?.dataset.scene||selectedScene;
  const scene=model.chapters.flatMap(chapter=>chapter.scenes).find(item=>item.path===path);
  if(!scene)return;
  writeScene(snapshot,scene,Number(anchor?.dataset.block)||0,async block=>{
    await render(index,selectedScene,false,true);
    const nodes=[...$('reader').querySelectorAll('[data-block]')].filter(node=>node.dataset.scene===path);
    (nodes.find(node=>Number(node.dataset.block)===block)||nodes.at(-1))?.scrollIntoView({block:'nearest'});
  });
};
function step(direction){
  if(index===-2){const pages=[...$('reader').querySelectorAll('.reading-page')],scroller=$('manuscript-scroll'),top=scroller.getBoundingClientRect().top;const current=Math.max(0,pages.findIndex(page=>page.getBoundingClientRect().bottom>top+1));const target=pages[Math.max(0,Math.min(pages.length-1,current+direction))];if(target)scroller.scrollTop+=target.getBoundingClientRect().top-top;pageStatus();return;}
  if(selectedScene){const all=model.chapters.flatMap((c,n)=>c.scenes.map(s=>({path:s.path,chapter:n}))),current=all.findIndex(s=>s.path===selectedScene),next=all[current+direction];if(next)navigate(next.chapter,next.path);return;}
  navigate(index+direction);
  }
async function openBook(value,resume=true){
  if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl='';snapshot=value;model=bookModel(value);highlights.load(value);
  for(const chapter of model.chapters)for(const scene of chapter.scenes){
    const draft=readDraft(value,scene);
    if(draft)scene.html=draft.html;
  }
  disposeCards();disposeCards=mountCards(value,{left:$('left-cards'),right:$('right-cards')},preference);
  if(model.cover){const type=/\.png$/i.test(model.cover.path)?'image/png':'image/jpeg';coverUrl=URL.createObjectURL(new Blob([model.cover.bytes],{type}));}
  document.title=model.title+' · Sidecar Reader';$('repository').value=value.repository;$('branch').value=value.branch;
  credentials.refresh();
  $('book-status').textContent=`${model.title} · Offline copy downloaded ${new Date(value.downloadedAt).toLocaleString()} · ${value.commit.slice(0,8)} · ${value.files.length} files`;
  $('outline').replaceChildren();const cover=element('button','Cover');cover.dataset.scope='cover';cover.onclick=()=>navigate(-1);const entire=element('button','Entire Novel');entire.dataset.scope='novel';entire.onclick=()=>navigate(-2);$('outline').append(cover,entire);
  model.chapters.forEach((chapter,n)=>{const details=element('details'),summary=element('summary',chapter.name),children=element('div'),all=element('button','Read chapter');all.dataset.scope=`chapter:${chapter.key}`;all.onclick=()=>navigate(n);children.append(all);
    for(const scene of chapter.scenes){const button=element('button',scene.name);button.dataset.scope=scene.path;button.onclick=()=>navigate(n,scene.path);children.append(button);}details.append(summary,children);$('outline').append(details);});
  $('outline-toggle').disabled=false;setOpen('connection',false);
  let saved=null;try{saved=JSON.parse(preference('position:'+locationKey())||'null');}catch{}
  const chosen=resume&&saved?.scope==='novel'?-2:resume&&saved?.chapter!==null?model.chapters.findIndex(c=>c.key===saved?.chapter):-1;
  const expectedRevision=renderRevision+1;
  await render(chosen,saved?.scope==='scene'?saved.scene:null,false);
  if(resume&&saved&&renderRevision===expectedRevision){$('manuscript-scroll').scrollTop=Number(saved.y)||0;pageStatus();remember();}
}
function navigate(n,path){if(innerWidth<=700)setOpen('outline',false);render(n,path);$('reader').focus({preventScroll:true});}
$('previous').onclick=()=>step(-1);$('next').onclick=()=>step(1);
let scrollTimer;$('manuscript-scroll').addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{remember();pageStatus();},100);},{passive:true});addEventListener('pagehide',remember);
function textSize(value){const size=['18','21','24','28'].includes(value)?value:'21';document.documentElement.style.setProperty('--reading-size',size+'px');$('size').value=size;preference('size',size);}
textSize(preference('size'));$('size').onchange=()=>{textSize($('size').value);repaginate();};
function controls(){for(const id of ['repository','branch','token','download','send-highlights','forget','remember-token','passphrase','confirm-passphrase','save-token','unlock-token','forget-saved-token'])$(id).disabled=busy||credentialBusy;$('cancel').hidden=!busy||!abort;$('progress').hidden=!busy;}
function lockGitHub(){client=null;clientKey='';$('token').value='';}
const credentials=mountCredentials({activate:(repository,branch,token)=>{client=readerClient(repository,branch,token);clientKey=JSON.stringify([repository,branch]);},lock:lockGitHub,message,onBusy:value=>{credentialBusy=value;controls();}});
for(const id of ['repository','branch','token'])$(id).oninput=()=>{client=null;clientKey='';};
$('forget').onclick=()=>{lockGitHub();credentials.clear();message('GitHub locked. Any encrypted saved token, your offline book and reading settings remain available.');};
$('send-highlights').onclick=async()=>{
  if(!snapshot||!client||clientKey!==JSON.stringify([snapshot.repository,snapshot.branch])){message('Unlock GitHub for the open book first.',true);return;}
  if(busy||credentialBusy)return;
  busy=true;controls();
  try{const count=await highlights.send(client.inbox);message(count?'Sent '+count+' highlight note(s). On PC choose Get tablet highlights.':'All highlight notes have been sent.');}
  catch(e){message(e.message,true);}finally{busy=false;controls();}
};
$('cancel').onclick=()=>abort?.abort();
$('download').onclick=async()=>{
  if(busy||credentialBusy)return;busy=true;controls();abort=new AbortController();$('progress').removeAttribute('value');
  try{
    const repository=repositoryName($('repository').value),branch=$('branch').value.trim(),key=JSON.stringify([repository,branch]);
    if(!client||clientKey!==key){if(!$('token').value&&credentials.hasSaved())throw Error('Unlock GitHub with your passphrase, then refresh the book.');client=readerClient(repository,branch,$('token').value);clientKey=key;$('token').value='';}
    if(snapshot&&(repository.toLowerCase()!==snapshot.repository.toLowerCase()||branch!==snapshot.branch)&&!confirm('Replace the offline book on this device with this repository? GitHub files are never changed.')){message('Download cancelled.');return;}
    message('Checking private repository and latest backup…');
    // Pass cancellation into the GET-only transport; token stays in its closure.
    const next=await client.download(snapshot,p=>{if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');$('progress').max=Math.max(1,p.total);$('progress').value=p.completed;message(`Downloading ${p.completed} of ${p.total} files · ${p.path}`);},abort.signal);
    if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');
    const verified=bookModel(next);if(!verified.chapters.length)throw Error('No readable manuscript found.');
    await saveBook(next);remember();await openBook(next);message('Book verified and saved for offline reading. No GitHub files were changed.');
    navigator.storage?.persist?.().catch(()=>{});
  }catch(error){message(error.message,true);setOpen('connection',true);}finally{busy=false;controls();abort=null;}
};
try{const saved=await readBook();if(saved)await openBook(saved);}catch(error){message(error.message,true);}
if('serviceWorker'in navigator&&isSecureContext){try{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline').textContent='Reader cached for offline opening. Use Chrome → Install app / Add to Home screen.';}catch{$('offline').textContent='Offline app setup failed. Reopen online and try again.';}}else $('offline').textContent='Open this app from an HTTPS website to enable offline installation.';
