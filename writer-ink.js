import {logEvent} from './input-events.js';
import {recognizeInk} from './ink-recognition.js';
import {inkPad} from './ink-pad.js';
import {readWriterDraft,writeWriterDraft} from './storage.js';

// One independent writing draft per library book. Only commit-complete saves
// acknowledge native strokes; unfinished writes keep their warning indicator.
export function mountWriterInk({status,onInsert}){
 const host=document.getElementById('writer-ink-canvas'),tools=document.getElementById('writer-ink-tools');
 let pad=null,owner=null,capturing=false,generation=0,locked=false,fitTimer=0,touch=null,operation=false,textDirty=false,revision=null,textState={accepted:[],pending:null};
 const button=(label,glyph,fn)=>{const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.textContent=glyph;if(label==='Writer pen'||label==='Writer eraser'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 26 26');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',label==='Writer pen'?'M4 20l4-1 12-12-5-5L3 14z M13 4l5 5 M4 14l5 5':'M3 14L13 4a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8H8z M7 10l10 10 M13 20h9');svg.append(path);b.replaceChildren(svg);}b.onclick=async()=>{try{await fn();}catch(e){status(e.message,true);}refresh();};tools.append(b);return b;};
 const textControls=document.getElementById('writer-text-controls'),accept=document.getElementById('writer-accept'),copy=document.getElementById('writer-copy'),conversionStatus=document.getElementById('writer-conversion-status');
 const pen=button('Writer pen','✎',()=>choose('pen'));
 const eraser=button('Writer eraser','▱',()=>choose('eraser'));
 button('Undo writer stroke','↶',()=>pad?.undo());
 const pauseButton=button('Pause handwriting','✓',()=>pause());
 const convertButton=button('Convert handwriting','Aa',convert);
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
 action('Retry save',async()=>{await settle();});
 let nativeLock=null;
 function refresh(){
  const lock=capturing||operation;
  if(lock!==nativeLock){nativeLock=lock;logEvent('writer guard '+lock);window.SidecarApp?.postMessage(lock?'writer-touch-lock':'writer-touch-unlock');}
  document.body.classList.toggle('writer-pen-active',capturing);
  document.getElementById('writer-ink-title').textContent=pad&&!capturing?'Paused':'Handwriting';
  pen.setAttribute('aria-pressed',String(capturing&&pad?.tool()==='pen'));eraser.setAttribute('aria-pressed',String(capturing&&pad?.tool()==='eraser'));
  pauseButton.setAttribute('aria-pressed',String(!capturing));
  for(const b of tools.querySelectorAll('button'))b.disabled=!pad||locked||operation;
  convertButton.disabled=!pad||locked||operation||!pad.strokeCount();
  accept.disabled=!pad||locked||operation||!textState.pending||textState.pending.stale;
  copy.disabled=operation||!textState.accepted.length;
  document.getElementById('writer-clear-text').disabled=!pad||locked||operation||(!textState.accepted.length&&!textState.pending);
  document.getElementById('writer-insert').disabled=locked||operation||!textState.accepted.length;
 }
 function choose(tool){if(!pad||locked||operation)return;if(pad.setTool(tool)!==false){capturing=true;refresh();}}
 function pause(){if(operation)return false;if(!pad)return true;if(!pad.suspend()){status('Finish the pen stroke before changing the workspace.');return false;}capturing=false;refresh();return true;}
 async function close(){
  if(operation){status("Wait for conversion or saving to finish.");return false;}
  generation++;clearTimeout(fitTimer);
  if(pad){if(!pause())return false;if(!await settle()){status('Handwriting has not finished saving. Stay here and retry, or copy ink data from ⋯.',true);return false;}pad.dispose();pad=null;}
  owner=null;textDirty=false;capturing=false;host.replaceChildren();textState={accepted:[],pending:null};renderText();refresh();return true;
 }
 async function open(book){
  if(pad&&owner?.id===book.id)return;
  if(!await close())throw Error('Save the current writing draft before changing books.');
  const ticket=++generation;owner=book;host.textContent='Loading writing draft…';
  try{
   const saved=await readWriterDraft(book);if(ticket!==generation)return;
   host.replaceChildren();revision=saved?.revision||null;textState=saved?.text||{accepted:[],pending:null};textDirty=false;renderText();
   const bounds=host.parentElement.getBoundingClientRect();
   const initial=saved?.ink||{version:1,width:800,height:Math.max(300,Math.min(12000,Math.floor((bounds.height-50)*800/Math.max(1,bounds.width)))),strokes:[]};
   createPad(initial);
   capturing=true;if(locked)pause();refresh();fitSurface();
  }catch(e){if(ticket!==generation)return;owner=null;host.textContent='Could not load writing draft. '+e.message;const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>{void open(book);};host.append(retry);status(e.message,true);refresh();}
 }
 async function settle(){
  if(operation)return false;if(!pad)return true;
  if(!await pad.settle())return false;
  if(textDirty){try{revision=await writeWriterDraft(owner,pad.copy(),revision,textState);textDirty=false;}catch(e){status(e.message,true);return false;}}
  return true;
 }
 function renderText(){
  const accepted=document.getElementById('writer-accepted'),pending=document.getElementById('writer-pending');
  accepted.replaceChildren(...textState.accepted.map(unit=>{const p=document.createElement('p');p.textContent=unit.text;return p;}));
  pending.textContent=textState.pending?.text||'';pending.hidden=!textState.pending;
  pending.classList.toggle('stale',!!textState.pending?.stale);
 }
 function createPad(ink){
  pad=inkPad(host,ink,async value=>{revision=await writeWriterDraft(owner,value,revision,structuredClone(textState));},undefined,{
   quiet:true,asyncSave:true,writer:true,onContentChange(){
    if(textState.pending){textState={...textState,pending:{...textState.pending,stale:true}};conversionStatus.textContent='Handwriting changed. Convert again before accepting.';renderText();}
    // The stroke is already in the pad when this notification runs.
    queueMicrotask(refresh);
   }
  });
 }
 async function work(fn){
  if(!pad||locked||operation)return;
  const resume=capturing,tool=pad.tool();if(!pause())return;operation=true;refresh();
  try{if(!await pad.settle())throw Error('Save the handwriting before continuing. Use Retry save in ⋯.');await fn();}
  catch(e){conversionStatus.textContent=e.message;status(e.message,true);}
  finally{operation=false;if(resume&&!locked)choose(tool);refresh();fitSurface();}
 }
 async function convert(){await work(async()=>{
  if(!pad.strokeCount())return;
  conversionStatus.textContent='Converting on this BOOX…';
  const text=await recognizeInk(pad.copy(),stage=>{conversionStatus.textContent=stage+'…';});
  if(!text.trim())throw Error('No text recognized. Your handwriting is unchanged.');
  const next={...textState,pending:{id:crypto.randomUUID(),text,stale:false}};
  // Keep the result visible on save failure; Accept will retry the atomic save.
  textState=next;textDirty=true;renderText();
  revision=await writeWriterDraft(owner,pad.copy(),revision,next);textDirty=false;
  conversionStatus.textContent='Review the text. Accept saves it and clears the handwriting.';
 });}
 accept.onclick=()=>work(async()=>{
  if(!textState.pending||textState.pending.stale)return;
  const next={accepted:[...textState.accepted,{id:textState.pending.id,text:textState.pending.text}],pending:null};
  const empty={version:1,width:800,height:pad.copy().height,strokes:[]};
  // Both text and empty ink are committed together. Never clear first.
  revision=await writeWriterDraft(owner,empty,revision,next);textDirty=false;
  pad.dispose();host.replaceChildren();textState=next;createPad(empty);pad.suspend();renderText();
  conversionStatus.textContent='Accepted and saved on this device. Ready for the next passage.';
 });
 document.getElementById('writer-clear-text').onclick=()=>work(async()=>{
  if(!confirm('Clear all accepted and pending text from the Text Conversion Frame? Handwriting and text already inserted in the manuscript will stay.'))return;
  const next={accepted:[],pending:null};revision=await writeWriterDraft(owner,pad.copy(),revision,next);
  textState=next;textDirty=false;renderText();conversionStatus.textContent='Conversion text cleared. Handwriting and manuscript text are unchanged.';
 });
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(textState.accepted.map(unit=>unit.text).join('\n\n'));conversionStatus.textContent='Accepted text copied.';}catch{conversionStatus.textContent='Copy failed. Pause handwriting to select and copy the text.';}};
 document.getElementById('writer-insert').onclick=async()=>{if(!pause()||!await settle())return;try{onInsert?.(textState.accepted.map(unit=>unit.text).join('\n\n'));}catch(e){status(e.message,true);}};
 function fitSurface(){
  clearTimeout(fitTimer);if(!pad||operation)return;
  const svg=host.querySelector('svg.annotation-ink'),width=svg?.getBoundingClientRect().width;
  if(!width||host.parentElement.clientHeight<=0)return;
  if(!pad.ensureHeight(host.parentElement.clientHeight*800/width))fitTimer=setTimeout(fitSurface,100);
 }
 new ResizeObserver(fitSurface).observe(host.parentElement);
 new ResizeObserver(fitSurface).observe(host);
 // Protect the whole app, not just the ink surface. A palm can land on
 // headers, menus or links and WebView may synthesize a later mouse click.
 // Handwriting controls accept deliberate short taps; other app controls stay
 // protected. Activate pen tools from pointer-up, before WebView synthesizes
 // a compatibility click that may incorrectly claim to be a touch event.
 let lastBlockedTouch=-Infinity,lastPointer='',penTap=null,handledTap=null;
 const writingControl=target=>{const b=target.closest?.('button,summary');return b&&(tools.contains(b)||textControls.contains(b))?b:null;};
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','click','contextmenu','mousedown','mouseup'])document.addEventListener(name,e=>{
  const control=writingControl(e.target);
  if(name==='pointerdown')handledTap=null;
  if(name==='click'&&e.detail!==0&&handledTap?.target===control&&performance.now()-handledTap.time<1000){stop(e);return;}
  if(e.pointerType==='pen'||e.pointerType==='mouse')lastPointer=e.pointerType;
  if(e.pointerType==='pen'){
   if(name==='pointerdown')penTap=control?{id:e.pointerId,target:control,x:e.clientX,y:e.clientY}:null;
   else if(name==='pointermove'&&penTap?.id===e.pointerId&&Math.hypot(e.clientX-penTap.x,e.clientY-penTap.y)>12)penTap=null;
   else if(name==='pointerup'&&penTap?.id===e.pointerId){const tap=penTap;penTap=null;if(control===tap.target){stop(e);handledTap={target:control,time:performance.now()};control.click();}}
   else if(name==='pointercancel')penTap=null;
   return;
  }
  const directTouch=e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents;
  const delayedTouch=!e.pointerType&&e.detail!==0&&lastPointer!=='pen'&&performance.now()-lastBlockedTouch<900;
  if(!(directTouch||delayedTouch)||(!capturing&&performance.now()-lastBlockedTouch>=900))return;
  if(directTouch){lastPointer='touch';lastBlockedTouch=performance.now();}
  stop(e);
  const target=control;
  if(name==='pointerdown'){
   if(touch){touch=null;return;}
   touch=capturing&&target&&!pad?.active()&&e.width<32&&e.height<32?{id:e.pointerId,target,x:e.clientX,y:e.clientY,time:performance.now()}:null;
  }else if(name==='pointermove'&&touch?.id===e.pointerId){if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8||e.width>=32||e.height>=32)touch=null;}
  else if(name==='pointerup'&&touch?.id===e.pointerId){const tap=touch;touch=null;if(target===tap.target&&performance.now()-tap.time<650&&!pad?.active()){handledTap={target,time:performance.now()};target.click();}}
  else if(name==='pointercancel')touch=null;
 },true);
 for(const name of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(name,e=>{
  if(capturing||performance.now()-lastBlockedTouch<900){lastPointer='touch';lastBlockedTouch=performance.now();if(!writingControl(e.target))stop(e);}
 },{capture:true,passive:false});
 document.addEventListener('click',e=>{if(!more.contains(e.target))more.open=false;});
 window.addEventListener('beforeunload',e=>{if(textDirty||(pad&&!pad.save())){e.preventDefault();e.returnValue='';}});
 refresh();return {acceptedText:()=>textState.accepted.map(unit=>unit.text).join('\n\n'),setBusy(value){locked=value;tools.classList.toggle('writer-tools-locked',value);if(value)pause();refresh();},open,close,pause,activeStroke:()=>operation||!!pad?.active(),settle,capturing:()=>capturing};
}
