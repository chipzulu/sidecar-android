import {inkPad} from './ink-pad.js';
import {readWriterDraft,writeWriterDraft} from './storage.js';

// One independent writing draft per library book. Only commit-complete saves
// acknowledge native strokes; unfinished writes keep their warning indicator.
export function mountWriterInk({status}){
 const host=document.getElementById('writer-ink-canvas'),tools=document.getElementById('writer-ink-tools');
 let pad=null,owner=null,capturing=false,generation=0,locked=false,fitTimer=0,touch=null;
 const button=(label,glyph,fn)=>{const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.textContent=glyph;if(label==='Writer pen'||label==='Writer eraser'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 26 26');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',label==='Writer pen'?'M4 20l4-1 12-12-5-5L3 14z M13 4l5 5 M4 14l5 5':'M3 14L13 4a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8H8z M7 10l10 10 M13 20h9');svg.append(path);b.replaceChildren(svg);}b.onclick=async()=>{try{await fn();}catch(e){status(e.message,true);}refresh();};tools.append(b);return b;};
 const pen=button('Writer pen','✎',()=>choose('pen'));
 const eraser=button('Writer eraser','▱',()=>choose('eraser'));
 button('Undo writer stroke','↶',()=>pad?.undo());
 const pauseButton=button('Pause handwriting','✓',()=>pause());
 const more=document.createElement('details');more.className='writer-more';const summary=document.createElement('summary');summary.textContent='⋯';summary.title='More handwriting actions';summary.setAttribute('aria-label','More handwriting actions');more.append(summary);
 const actions=document.createElement('div');more.append(actions);tools.append(more);
 function action(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{more.open=false;try{await fn();}catch(e){status(e.message,true);}};actions.append(b);}
 action('More writing space',()=>pad?.more());action('Clear handwriting…',()=>pad?.clear());
 action('Copy ink data',async()=>{
  if(!pad||pad.active())return;
  try{await navigator.clipboard.writeText(JSON.stringify({format:'sidecar-writer-ink',version:1,book:owner.repository,ink:pad.copy()}));host.querySelector('[role=status]').textContent='Ink data copied. Paste it into a text file to keep a recovery copy.';}catch{throw Error('Could not copy ink data. Keep this workspace open and retry saving.');}
 });
 if(!window.SidecarApp)action('Save ink copy…',()=>{
  if(!pad||pad.active())return;
  const url=URL.createObjectURL(new Blob([JSON.stringify({format:'sidecar-writer-ink',version:1,book:owner.repository,ink:pad.copy()})],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='Story-Sidecar-writing.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 });
 action('Retry save',()=>{void pad?.settle();});
 function refresh(){
  document.body.classList.toggle('writer-pen-active',capturing);
  document.getElementById('writer-ink-title').textContent=pad&&!capturing?'Paused':'Handwriting';
  pen.setAttribute('aria-pressed',String(capturing&&pad?.tool()==='pen'));eraser.setAttribute('aria-pressed',String(capturing&&pad?.tool()==='eraser'));
  pauseButton.setAttribute('aria-pressed',String(!capturing));
  for(const b of tools.querySelectorAll('button'))b.disabled=!pad||locked;
 }
 function choose(tool){if(!pad||locked)return;if(pad.setTool(tool)!==false){capturing=true;refresh();}}
 function pause(){if(!pad)return true;if(!pad.suspend()){status('Finish the pen stroke before changing the workspace.');return false;}capturing=false;refresh();return true;}
 async function close(){
  generation++;clearTimeout(fitTimer);
  if(pad){if(!pause())return false;if(!await pad.settle()){status('Handwriting has not finished saving. Stay here and retry, or copy ink data from ⋯.',true);return false;}pad.dispose();pad=null;}
  owner=null;capturing=false;host.replaceChildren();refresh();return true;
 }
 async function open(book){
  if(pad&&owner?.id===book.id)return;
  if(!await close())throw Error('Save the current writing draft before changing books.');
  const ticket=++generation;owner=book;host.textContent='Loading writing draft…';
  try{
   const saved=await readWriterDraft(book);if(ticket!==generation)return;
   host.replaceChildren();let revision=saved?.revision||null;
   const bounds=host.parentElement.getBoundingClientRect();
   const initial=saved?.ink||{version:1,width:800,height:Math.max(300,Math.min(12000,Math.floor((bounds.height-50)*800/Math.max(1,bounds.width)))),strokes:[]};
   pad=inkPad(host,initial,async ink=>{revision=await writeWriterDraft(book,ink,revision);},undefined,{quiet:true,asyncSave:true,writer:true});
   capturing=true;if(locked)pause();refresh();fitSurface();
  }catch(e){if(ticket!==generation)return;owner=null;host.textContent='Could not load writing draft. '+e.message;const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>{void open(book);};host.append(retry);status(e.message,true);refresh();}
 }
 function fitSurface(){
  clearTimeout(fitTimer);if(!pad)return;
  const svg=host.querySelector('svg.annotation-ink'),width=svg?.getBoundingClientRect().width;
  if(!width||host.parentElement.clientHeight<=0)return;
  if(!pad.ensureHeight(host.parentElement.clientHeight*800/width))fitTimer=setTimeout(fitSurface,100);
 }
 new ResizeObserver(fitSurface).observe(host.parentElement);
 new ResizeObserver(fitSurface).observe(host);
 // A resting palm must not press a tool. Finger tools require a short, small,
 // completed tap; the pen and keyboard retain ordinary button behaviour.
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','click'])document.addEventListener(name,e=>{
  if(!capturing||e.pointerType!=='touch'||!tools.contains(e.target))return;
  e.preventDefault();e.stopImmediatePropagation();
  const target=e.target.closest('button,summary');
  if(name==='pointerdown'){
   if(touch){touch=null;return;}
   touch=target&&!pad?.active()&&e.width<32&&e.height<32?{id:e.pointerId,target,x:e.clientX,y:e.clientY,time:performance.now()}:null;
  }else if(name==='pointermove'&&touch?.id===e.pointerId){if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8||e.width>=32||e.height>=32)touch=null;}
  else if(name==='pointerup'&&touch?.id===e.pointerId){const tap=touch;touch=null;if(target===tap.target&&performance.now()-tap.time<400&&!pad?.active())tap.target.click();}
  else if(name==='pointercancel')touch=null;
 },true);
 // Fingers/palms cannot draw. While the pen is enabled, also protect the two
 // reading surfaces from palm scrolling/clicks. Explicit controls remain usable.
 const surface=target=>target.closest?.('#manuscript-scroll,#writer-text,#writer-ink-canvas,#writer-column-edge,#writer-row-edge');
 for(const name of ['pointerdown','pointermove','pointerup','click'])document.addEventListener(name,e=>{
  if(capturing&&surface(e.target)&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 for(const name of ['touchstart','touchmove'])document.addEventListener(name,e=>{if(capturing&&surface(e.target)){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
 document.addEventListener('click',e=>{if(!more.contains(e.target))more.open=false;});
 window.addEventListener('beforeunload',e=>{if(pad&&!pad.save()){e.preventDefault();e.returnValue='';}});
 refresh();return {setBusy(value){locked=value;tools.classList.toggle('writer-tools-locked',value);if(value)pause();refresh();},open,close,pause,activeStroke:()=>!!pad?.active(),settle:async()=>!pad||await pad.settle(),capturing:()=>capturing};
}
