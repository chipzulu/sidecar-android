import {pressureSensitivity} from './pressure.js';
import {mountLibrary} from './library-view.js';
import {readerClient,repositoryName} from './api.js';
import {bookModel,chapterHeadingParts,sceneHeadingParts} from './model.js';
import {readBook,saveBook,bookIdentity,readBookIdentity,removeBook,clearBookWork,workKey,libraryReady,lastConnection,listConnections,findBook,markBookSent,selectBook,relinkBook,recordRemoteCheck} from './storage.js';
import {inlineFragment,sceneNotes,colourMarks} from './inline-notes.js';
import {convertItalicMarkers} from './shared/italic-markers.js';
import {keepMarker} from './shared/keep-together.js';
import {fitLayout} from './layout.js';
import {paginate} from './pages.js';
import {mountCards} from './cards.js';
import {mountCredentials} from './credentials-ui.js';
import {readDraft, writeScene} from './writing.js';
import {mountHighlights} from './highlights.js';
try{await libraryReady;}catch(error){document.getElementById("status").textContent=error.message;throw error;}
const $=id=>document.getElementById(id);
let libraryMode=true,libraryView,menuBook=null,configBook=null;
let snapshot=null,model=null,index=-1,coverUrl='',busy=false,credentialBusy=false,client=null,clientKey='',abort=null,disposeCards=()=>{},selectedScene=null,renderRevision=0,rendering=false, replacing=false;
function message(text,error=false){$('updates-status').textContent=text;if(libraryMode){$('library-error').textContent=text;$('library-error').classList.toggle('error',error);}$('status').textContent=text;$('status').classList.toggle('error',error);}
const highlights=mountHighlights({reader:$('reader'),viewport:$('manuscript-scroll'),status:message,onEditScene:at=>editScene(at),onWriting:()=>{if(dock)setOpen(dock,false);}});
function preference(key,value){try{if(value===undefined)return localStorage.getItem('sidecar-reader:'+key);localStorage.setItem('sidecar-reader:'+key,value);}catch{/* Reading remains usable without preferences. */}}
function remember(){if(snapshot&&!libraryMode&&!rendering&&!replacing)localStorage.setItem(workKey(snapshot,'position'),JSON.stringify({scope:index===-2?'novel':selectedScene?'scene':index===-1?'cover':'chapter',chapter:model.chapters[index]?.key??null,scene:selectedScene,y:$('manuscript-scroll').scrollTop}));}
let pageWidth=Math.max(280,Number(preference('page-width'))||740),pageLines=Math.max(15,Math.min(60,Number(preference('page-lines'))||28)),cardMode=preference('card-layout')||'none',dock='';
let layoutTimer,lastPageWidth=0;
function repaginate(){if(!model||index===-1)return;return render(index,selectedScene,false,true);}
function layout(){
  const headerBottom=document.querySelector('header').getBoundingClientRect().bottom;
  $('connection').style.top=(headerBottom+8)+'px';$('updates-panel').style.top=(headerBottom+8)+'px';
  $('connection').style.maxHeight=Math.max(80,innerHeight-headerBottom-20)+'px';
  if(libraryMode)return;
  const available=document.querySelector('.layout').clientWidth;const fit=fitLayout(available,pageWidth,cardMode,Boolean(dock));
  document.documentElement.style.setProperty('--page-width',fit.page+'px');
  for(const [id,width] of [['left-cards',fit.left],['right-cards',fit.right]]){$(id).hidden=!width;$(id).style.width=width+'px';}
  const edge=(available-fit.page-32)/2;
  $('left-cards').style.left=Math.max(0,edge-fit.left)+'px';$('right-cards').style.left=(available-edge)+'px';
  $('right-panel').hidden=!dock;$('right-panel').classList.toggle('overlay',fit.overlay);$('right-panel').style.width=(fit.dock||Math.min(280,available))+'px';
  $('page-width').max=Math.floor(Math.max(1,available-32));$('page-width').value=Math.round(fit.page);$('page-width').min=Math.min(280,fit.page);
  $('width-feedback').textContent='Page width: '+Math.round(fit.page)+' px';
  $('width-handle').hidden=dock!=='configuration';
  requestAnimationFrame(()=>{$('width-handle').style.left=(Math.max(0,$('reader').getBoundingClientRect().left-16))+'px';});
  $('layout-note').textContent=(cardMode!=='none'&&!fit.left?'Cards hidden: there is no usable space beside this page. ':cardMode==='both'&&!fit.right?'Right cards hidden at this width. ':'')+(fit.overlay?'The right panel overlays the page at this width.':'');
  if(lastPageWidth!==fit.page){lastPageWidth=fit.page;clearTimeout(layoutTimer);layoutTimer=setTimeout(repaginate,100);}
}
function setOpen(id,open){if(id==='outline'||id==='configuration'){dock=open?id:'';for(const name of ['outline','configuration']){$(name).hidden=dock!==name;$(name+'-toggle').setAttribute('aria-expanded',String(dock===name));}layout();return;}$(id).hidden=!open;if(id!=='connection')$(id+'-toggle').setAttribute('aria-expanded',String(open));layout();}
$('connection-toggle').onclick=()=>{if(busy||credentialBusy)return;const panel=$('updates-panel');panel.hidden=!panel.hidden;if(!panel.hidden&&snapshot){const drafts=Object.keys(localStorage).filter(k=>k.startsWith('sidecar-book:'+snapshot.id+':draft:')).length;$('peer-status').textContent=(snapshot.syncBase?'Shared base: '+snapshot.syncBase.commit.slice(0,8):'Shared base unknown')+' · '+drafts+' local scene draft(s), including inline annotations. Text transfer is not enabled yet.';}$('connection-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
$('outline-toggle').onclick=()=>setOpen('outline',$('outline').hidden);
$('configuration-toggle').onclick=()=>setOpen('configuration',$('configuration').hidden);$('close-panel').onclick=()=>setOpen(dock,false);
// Closing a panel never consumes the outside action or changes note-edit state.
document.addEventListener('click',event=>{
 const target=event.target;
 if(!target.closest('#updates-panel,#connection-toggle,dialog')){$('updates-panel').hidden=true;$('connection-toggle').setAttribute('aria-expanded','false');}
 if(dock&&!target.closest('#right-panel,#outline-toggle,#configuration-toggle,#width-handle,dialog'))setOpen(dock,false);
 if(!$('connection').hidden&&!target.closest('#connection,#connection-toggle,dialog'))setOpen('connection',false);
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!document.querySelector('dialog[open]')){$('updates-panel').hidden=true;$('connection-toggle').setAttribute('aria-expanded','false');if(dock)setOpen(dock,false);if(!$('connection').hidden)setOpen('connection',false);}
});

for(const [id,defaultOn] of [['pen-pressure',false],['writing-lift',true],['writing-left',false]]){
  $(id).checked=preference(id)==null?defaultOn:preference(id)==='true';
  $(id).onchange=()=>preference(id,String($(id).checked));
}
const sensitivityControl=$('pressure-sensitivity');sensitivityControl.value=pressureSensitivity(preference('pressure-sensitivity'));
function sensitivityLabel(){const value=Number(sensitivityControl.value);$('pressure-sensitivity-value').textContent=value.toFixed(1)+'×';sensitivityControl.setAttribute('aria-valuetext',value.toFixed(1)+' times sensitivity');}
sensitivityLabel();sensitivityControl.oninput=()=>{preference('pressure-sensitivity',sensitivityControl.value);sensitivityLabel();};
$('pen-width').value=['2.5','4','6'].includes(preference('pen-width'))?preference('pen-width'):'2.5';
$('pen-width').onchange=()=>preference('pen-width',$('pen-width').value);
$('page-lines').value=pageLines;$('card-layout').value=cardMode;
$('page-lines').onchange=()=>{pageLines=Math.max(15,Math.min(60,Number($('page-lines').value)||28));$('page-lines').value=pageLines;preference('page-lines',String(pageLines));repaginate();};
function resizePage(value){pageWidth=Math.max(Math.min(280,document.querySelector('.layout').clientWidth-32),Math.min(value,document.querySelector('.layout').clientWidth-32));preference('page-width',String(pageWidth));layout();}
$('page-width').onchange=()=>resizePage(Number($('page-width').value)||740);
$('card-layout').onchange=()=>{cardMode=$('card-layout').value;preference('card-layout',cardMode);layout();};
$('width-handle').onpointerdown=event=>{
 if(event.button!==0)return;
 event.preventDefault();const x=event.clientX,start=$('reader').clientWidth,handle=event.currentTarget;
 handle.setPointerCapture(event.pointerId);
 document.body.classList.add('resizing-page');$('width-feedback').hidden=false;
 handle.onpointermove=e=>resizePage(start-(e.clientX-x)*2);
 const finish=()=>{handle.onpointermove=null;document.body.classList.remove('resizing-page');$('width-feedback').hidden=true;};
 handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=finish;
};
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
      const prose=element('div',undefined,'scene');prose.append(inlineFragment(scene.html));colourMarks(prose,sceneNotes(scene.html));
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
  if(!highlights.beforeRender())return;
  if((which!==index||scenePath!==selectedScene)&&!document.getElementById("highlight-tools").hidden)document.getElementById("highlight-cancel").click();
  const revision=++renderRevision,scroller=$('manuscript-scroll'),fraction=scroller.scrollTop/Math.max(1,scroller.scrollHeight-scroller.clientHeight);
  index=which===-2?-2:Math.max(-1,Math.min(model.chapters.length-1,which));selectedScene=index>=0&&model.chapters[index].scenes.some(s=>s.path===scenePath)?scenePath:null;
  const reader=$('reader');reader.replaceChildren();rendering=true;reader.setAttribute('aria-busy','true');
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
    highlights.repaint();
    if(preserve)scroller.scrollTop=fraction*Math.max(0,scroller.scrollHeight-scroller.clientHeight);else if(scroll)scroller.scrollTop=0;
    $('previous').disabled=index===-1;$('next').disabled=index>=model.chapters.length-1&&!selectedScene;
    if(selectedScene){const all=model.chapters.flatMap(c=>c.scenes);const sceneIndex=all.findIndex(s=>s.path===selectedScene);$('previous').disabled=sceneIndex===0;$('next').disabled=sceneIndex===all.length-1;}
  }catch(error){if(revision===renderRevision){$('page-count').textContent='Page estimate unavailable';message(error.message,true);setOpen('connection',true);}}
  finally{if(revision===renderRevision){rendering=false;reader.setAttribute('aria-busy','false');pageStatus();remember();}}
}
let tappedBlock=null;
$('reader').addEventListener('click',event=>{tappedBlock=event.target.closest('[data-block]');});
function editScene(at){
  if(rendering||busy)return;
  const viewport=$('manuscript-scroll').getBoundingClientRect();
  const visible=node=>node.getBoundingClientRect().bottom>viewport.top&&node.getBoundingClientRect().top<viewport.bottom;
  const blocks=[...$('reader').querySelectorAll('[data-block]')];
  const targeted=at?.range?.startContainer;
  const anchor=(targeted?.nodeType===Node.TEXT_NODE?targeted.parentElement:targeted)?.closest('[data-block]')||(tappedBlock?.isConnected&&visible(tappedBlock)?tappedBlock:blocks.find(visible)||blocks[0]);
  const path=at?.path||anchor?.dataset.scene||selectedScene;
  const scene=model.chapters.flatMap(chapter=>chapter.scenes).find(item=>item.path===path);
  if(!scene)return;
  writeScene(snapshot,scene,Number(anchor?.dataset.block)||0,async block=>{
    highlights.sceneEdited(scene);
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
  if(!highlights.beforeRender())throw Error('Save the handwriting before switching books.');
  if(client && clientKey!==JSON.stringify([value.repository,value.branch]))lockGitHub();
  if(coverUrl)URL.revokeObjectURL(coverUrl);coverUrl='';snapshot=value;model=bookModel(value);libraryMode=false;document.body.classList.remove('library-mode');$('library').hidden=true;$('library-toggle').hidden=false;layout();
  for(const chapter of model.chapters)for(const scene of chapter.scenes){
    const draft=readDraft(value,scene);
    if(draft)scene.html=draft.html;
  }
  highlights.load(value,model);
  disposeCards();disposeCards=mountCards(value,{left:$('left-cards'),right:$('right-cards')},(key,value)=>{const k=workKey(snapshot,'card',key);if(value===undefined)return localStorage.getItem(k);localStorage.setItem(k,value);});
  if(model.cover){const type=/\.png$/i.test(model.cover.path)?'image/png':'image/jpeg';coverUrl=URL.createObjectURL(new Blob([model.cover.bytes],{type}));}
  document.title=model.title+' · Sidecar Reader';$('repository').value=value.repository;$('branch').value=value.branch;
  credentials.refresh();$('fresh-copy').hidden=false;
  $('book-status').textContent=`${model.title} · ${value.repository} (${value.branch}) · Offline copy downloaded ${new Date(value.downloadedAt).toLocaleString()} · ${value.commit.slice(0,8)} · ${value.files.length} files`;
  $('outline').replaceChildren();const cover=element('button','Cover');cover.dataset.scope='cover';cover.onclick=()=>navigate(-1);const entire=element('button','Entire Novel');entire.dataset.scope='novel';entire.onclick=()=>navigate(-2);$('outline').append(cover,entire);
  model.chapters.forEach((chapter,n)=>{const details=element('details'),summary=element('summary',chapter.name),children=element('div'),all=element('button','Read chapter');all.dataset.scope=`chapter:${chapter.key}`;all.onclick=()=>navigate(n);children.append(all);
    for(const scene of chapter.scenes){const button=element('button',scene.name);button.dataset.scope=scene.path;button.onclick=()=>navigate(n,scene.path);children.append(button);}details.append(summary,children);$('outline').append(details);});
  $('outline-toggle').disabled=false;setOpen('connection',false);
  let saved=null;try{saved=JSON.parse(localStorage.getItem(workKey(value,'position'))||'null');}catch{}
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
function controls(){for(const id of ['repository','branch','token','download','send-highlights','remember-token','save-token','replace-token','cancel-token','forget-saved-token','remove-book','fresh-copy','receive-updates','book-settings','book-refresh','book-check','save-connection','library-toggle','library-add','book-menu-open','saved-connections'])$(id).disabled=busy||credentialBusy;$('cancel').hidden=!busy||!abort;$('progress').hidden=!busy;$('updates-cancel').hidden=!busy||!abort;}
function lockGitHub(){client=null;clientKey='';$('token').value='';}
const rescued=await lastConnection();if(rescued){$('repository').value=rescued.repository;$('branch').value=rescued.branch;}
const profiles=await listConnections();const choices=$('saved-connections');for(const c of profiles)choices.add(new Option(c.repository+' · '+c.branch,c.key));choices.hidden=!profiles.length;choices.onchange=()=>{const c=profiles.find(c=>c.key===choices.value);if(c){$('repository').value=c.repository;$('branch').value=c.branch;credentials.refresh();}};
const credentials=mountCredentials({activate:(repository,branch,token)=>{client=readerClient(repository,branch,token);clientKey=JSON.stringify([repository,branch]);},lock:lockGitHub,message,onBusy:value=>{credentialBusy=value;controls();}});
$('send-highlights').onclick=async()=>{
  if(!snapshot){message('Download a book first.',true);return;}
  if(busy||credentialBusy)return;
  busy=true;controls();
  try{
    await targetCredentials(snapshot);
    await credentials.ensure();
    const count=await highlights.send(client.inbox);if(count)await markBookSent(snapshot);message(count?'Sent '+count+' highlight note(s). On PC choose Get tablet highlights.':'No attached highlight notes waiting to send.');}
  catch(e){message(e.message,true);}finally{busy=false;controls();}
};
async function targetCredentials(book){
 const different=$('repository').value.trim().toLowerCase()!==book.repository.toLowerCase();
 $('repository').value=book.repository;$('branch').value=book.branch;
 if(different)await credentials.refresh();
}
async function configureFor(book){
 if(book){$('repository').value=book.repository;$('branch').value=book.branch;}
 await credentials.refresh();
}
async function openSettings(book=null){
 if(busy||credentialBusy)return;configBook=book;
 $('connection-title').textContent=book?'GitHub · '+(book.title||book.repository):'Add a book from GitHub';
 $('download').hidden=!!book;$('save-connection').hidden=!book;choices.hidden=!!book||!profiles.length;
 if(book)await configureFor(book);setOpen('connection',true);
}
$('save-connection').onclick=async()=>{
 if(!configBook||busy||credentialBusy)return;
 const book=configBook;
 try{const repository=repositoryName($('repository').value),branch=$('branch').value.trim();if(!branch)throw Error('Enter a branch.');
 if(repository!==book.repository||branch!==book.branch){if(!confirm('Change the GitHub connection for '+book.title+'? The local book and notes stay on this device. Nothing is sent.'))return;configBook=await relinkBook(book,repository,branch);}
 await libraryView.refresh(book.id);message('Connection saved. Token controls above manage its access token.');
 }catch(e){message('Could not save connection. It may already belong to another library book. '+e.message,true);}
};
$('book-menu-close').onclick=()=>$('book-menu').close();
$('book-menu').addEventListener('click',e=>{if(e.target===$('book-menu')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('book-settings').onclick=async()=>{const book=menuBook;$('book-menu').close();await openSettings(await readBook(book.id));};
$('book-check').onclick=async()=>{
 const selected=menuBook;if(!selected||busy||credentialBusy)return;$('book-menu').close();busy=true;controls();
 try{const book=await readBook(selected.id);if(!book)throw Error('Book is no longer available.');await targetCredentials(book);await credentials.ensure();message('Checking the GitHub backup…');const commit=await client.check();await recordRemoteCheck(book,commit);await libraryView.refresh(book.id);message(commit===book.commit?'The downloaded backup matches GitHub.':'GitHub has a different backup. Open the book and choose Receive updates when ready.');}
 catch(error){message(error.message,true);}finally{busy=false;controls();}
};
$('book-refresh').onclick=async()=>{const book=menuBook;$('book-menu').close();await downloadBook(true,await readBook(book.id));};
$('remove-book').onclick=async()=>{
 const row=menuBook;if(!row||busy||credentialBusy)return;$('book-menu').close();
 if(!confirm('Remove '+row.title+' from this device? Its local drafts and annotations, including unsent work, will be deleted. GitHub and saved tokens are kept.'))return;
 busy=true;controls();try{const book=await readBook(row.id);if(!book)throw Error('Book is no longer available.');await removeBook(book);if(snapshot?.id===book.id)snapshot=null;bookUpdates.postMessage('removed');await libraryView.refresh();message('Removed from this device.');}catch(e){message(e.message,true);}finally{busy=false;controls();}
};
$('cancel').onclick=()=>abort?.abort();
$('download').onclick=()=>downloadBook(false);
$('fresh-copy').onclick=()=>downloadBook(true,snapshot);
$('receive-updates').onclick=()=>downloadBook(false,snapshot);
$('updates-cancel').onclick=()=>abort?.abort();
async function downloadBook(fresh,target=null){
  if(busy||credentialBusy)return;
  if(fresh&&!confirm('Replace '+(target?.title||target?.repository||'this book')+' with a fresh copy from GitHub? All local scene edits, annotations and reading position for this repository will be discarded, including unsent work. GitHub files and your token are kept.'))return;
  if(!highlights.beforeRender())return;
  busy=true;controls();abort=new AbortController();$('progress').removeAttribute('value');
  try{
    if(target)await targetCredentials(target);
    const repository=repositoryName($('repository').value),branch=$('branch').value.trim();
    await credentials.ensure();
    if(!target&&snapshot&&(repository.toLowerCase()!==snapshot.repository.toLowerCase()||branch!==snapshot.branch)&&!confirm(`Open ${repository} (${branch}) and keep ${model.title} in the local library?`)){message('Download cancelled.');return;}
    message('Checking private repository and latest backup…');
    // Pass cancellation into the GET-only transport; token stays in its closure.
    const next=await client.download(fresh?null:await findBook(repository,branch),p=>{if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');$('progress').max=Math.max(1,p.total);$('progress').value=p.completed;message(`Downloading ${p.completed} of ${p.total} files · ${p.path}`);},abort.signal);
    if(abort.signal.aborted)throw Error('Download cancelled. Previous offline book retained.');
    const verified=bookModel(next);if(!verified.chapters.length)throw Error('No readable manuscript found.');
    if(!fresh){const previous=target||await findBook(repository,branch);if(previous){const incoming=new Map(next.files.map(f=>[f.path,f.sha]));const conflicts=bookModel(previous).chapters.flatMap(c=>c.scenes).filter(scene=>{const draft=readDraft(previous,scene);return draft&&draft.base!==incoming.get(scene.path);});if(conflicts.length)throw Error('Receive stopped: '+conflicts.length+' locally edited scene(s) also changed or were removed remotely. Local work is kept. Resolve these changes before receiving, or deliberately use Refresh from remote.');}}
    next.title=verified.title;await saveBook(next);
    if(fresh){clearTimeout(scrollTimer);clearBookWork(next);bookUpdates.postMessage('saved');if(libraryMode){if(snapshot?.id===next.id)snapshot=null;await libraryView.refresh(next.id);}else{replacing=true;await openBook(next,false);replacing=false;}message('Fresh copy received. Local work for this book was replaced.');return;}
    bookUpdates.postMessage('saved');remember();await openBook(next);message('Book verified and saved for offline reading. No GitHub files were changed.');
    navigator.storage?.persist?.().catch(()=>{});
  }catch(error){message(error.message,true);if(!target)setOpen('connection',true);}finally{busy=false;controls();abort=null;void reconcileBook();}
};
// The installed reader and Chrome can share the database while keeping separate pages in memory.
const bookUpdates=new BroadcastChannel('sidecar-reader-book');
let checking=false, checkAgain=false;
function canSwitchBook(){return !libraryMode&&!replacing&&!busy&&!credentialBusy&&!document.querySelector('dialog[open]');}
async function reconcileBook(){
  if(!canSwitchBook())return;
  if(checking){checkAgain=true;return;}
  checking=true;
  try{
    const identity=await readBookIdentity();
    if(!identity&&snapshot){
      const current=await readBook();
      if(!current&&canSwitchBook()){location.reload();return;}
    }
    if(identity && identity!==bookIdentity(snapshot)){
      const latest=await readBook();
      if(latest&&canSwitchBook()&&bookIdentity(latest)!==bookIdentity(snapshot)){
        remember();await openBook(latest);
      }
    }
  }catch(error){message(error.message,true);}
  finally{checking=false;if(checkAgain){checkAgain=false;void reconcileBook();}}
}
libraryView=mountLibrary({open:async id=>{if(busy||credentialBusy||!highlights.beforeRender())return;remember();await openBook(await selectBook(id));},add:()=>{void openSettings();},options:row=>{if(busy||credentialBusy)return;menuBook=row;$('book-menu-title').textContent=row.title;$('book-menu').showModal();},error:text=>{$('library-error').textContent=text;}});
async function showLibrary(){
 if(busy||credentialBusy||!highlights.beforeRender())return;
 remember();clearTimeout(scrollTimer);$('updates-panel').hidden=true;libraryMode=true;document.body.classList.add('library-mode');$('library').hidden=false;$('library-toggle').hidden=true;
 if(dock)setOpen(dock,false);setOpen('connection',false);document.title='Your library · Story Sidecar';
 await libraryView.refresh(snapshot?.id);$('library-add').focus({preventScroll:true});
}
$('library-toggle').onclick=()=>{void showLibrary();};$('library-about').onclick=()=>$('about-open').click();
try{await libraryView.refresh((await readBook())?.id);}catch(error){$('library-error').textContent=error.message;}

bookUpdates.onmessage=()=>{if(libraryMode)void libraryView.refresh();else void reconcileBook();};
window.addEventListener('pageshow',reconcileBook);
window.addEventListener('focus',reconcileBook);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconcileBook();});
document.addEventListener('close',reconcileBook,true);
void reconcileBook();
if('serviceWorker'in navigator&&isSecureContext){try{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline').textContent='Reader cached for offline opening. Use Chrome → Install app / Add to Home screen.';}catch{$('offline').textContent='Offline app setup failed. Reopen online and try again.';}}else $('offline').textContent='Open this app from an HTTPS website to enable offline installation.';
