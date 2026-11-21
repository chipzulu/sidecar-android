import {adjustedPressure} from './pressure.js';
import {browserInkInput} from './ink-input.js';

// Closed <details> content can retain nonzero layout bounds in Chromium.
// Native exclusion rectangles must describe painted controls, not layout alone.
export function visiblePenRect(el,limit){
 for(let node=el;node;node=node.parentElement){
  const style=getComputedStyle(node);
  if(node.hidden||style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0)return null;
  const parent=node.parentElement;
  if(parent?.tagName==='DETAILS'&&!parent.open&&node!==parent.querySelector(':scope > summary'))return null;
 }
 const b=el.getBoundingClientRect();if(!b.width||!b.height)return null;
 let [left,top,right,bottom]=[Math.max(limit[0],b.left),Math.max(limit[1],b.top),Math.min(limit[2],b.right),Math.min(limit[3],b.bottom)];
 for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),r=p.getBoundingClientRect();
  if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,r.left);right=Math.min(right,r.right);}
  if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}
 }
 return right>left&&bottom>top?[left,top,right,bottom]:null;
}

// Protocol 1 uses CSS viewport pixels; the native host converts to physical view pixels.
export function adaptiveInkInput(svg, callbacks, {tool='pen',browserFactory=browserInkInput}={}) {
  const erasing=tool==='eraser';
  const bridge=window.SidecarNativePen;
  if(!bridge?.postMessage)return browserFactory(svg,callbacks);
  const session=crypto.randomUUID();
  const diagnostic={tool,begun:0,received:0,accepted:0,rejected:0,last:'Waiting for a stroke'};
  window.sidecarInkDiagnostic=diagnostic;
  function reject(reason){diagnostic.rejected++;diagnostic.last=reason;badge.textContent='Handwriting not accepted: '+reason;}

  let capacityBlocked=false;
  let fallback=null,ready=false,disposed=false,busy=false,frame=0,last='',gesture=null,lastBatch=0;
  const received=new Set(),awaitingSave=new Set();
  const strip=document.createElementNS('http://www.w3.org/2000/svg','rect');
  strip.setAttribute('x','0');strip.setAttribute('y','0');strip.setAttribute('width','5');strip.setAttribute('height','0');strip.style.pointerEvents='none';svg.append(strip);
  let saveTimer=0,savePending=0,saveSince=0,savedMark=0;
  function paintSaveState(){
    clearTimeout(saveTimer);if(disposed)return;
    const now=performance.now(),fraction=savePending?Math.min(1,savePending/12):savedMark?(savedMark%2?.08:.14):0;
    strip.setAttribute('height',String(fraction?Math.max(8,callbacks.height()*fraction):0));
    strip.setAttribute('fill',savePending?(now-saveSince>=10000?'#9b2d28':'#aa7323'):'#345346');
    // Keep feedback above ink without changing capture or native screen-update modes.
    if(svg.lastChild!==strip)svg.append(strip);
    // Only schedule the transition to red; successful saves have no fade timer.
    if(savePending&&now-saveSince<10000)saveTimer=setTimeout(paintSaveState,Math.max(1,10000-(now-saveSince)));
  }
  function confirmSaved(){if(callbacks.isSaved?.()!==true)return;for(const id of awaitingSave)send("saved",{id});awaitingSave.clear();}
  const badge=document.createElement('small');badge.textContent=erasing?'Connecting BOOX eraser…':'Connecting BOOX pen…';svg.before(badge);
  function send(type,extra={}){bridge.postMessage(JSON.stringify({version:1,type,session,...extra}));}
  function useBrowser(reason){
    if(disposed||fallback)return;
    try{send('close');}catch{}
    ready=false;busy=false;fallback=browserFactory(svg,callbacks);
    badge.textContent=(erasing?'Browser eraser':'Browser pen')+(reason?' — '+reason:'');
  }
  function update(){
    frame=0;if(disposed||fallback||!svg.isConnected)return;
    const r=svg.getBoundingClientRect();
    let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
    for(let p=svg.parentElement;p;p=p.parentElement){
      const style=getComputedStyle(p),b=p.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right);}
      if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}
    }
    const exclude=[];
    for(const el of document.querySelectorAll('button,input,textarea,select,a,[role="button"],[role="separator"],summary,.writer-more[open],.writer-more[open]>div,#writer-ink-canvas>[role="status"],dialog[open],header,.note-palette,#right-panel:not([hidden]),#connection:not([hidden]),#updates-panel:not([hidden])')){
      const bounds=visiblePenRect(el,[left,top,right,bottom]);if(bounds)exclude.push(bounds);
    }
    const enabled=!capacityBlocked&&!document.hidden&&!document.querySelector('dialog[open],.note-palette.dragging,.writer-resizing')&&(visualViewport?.scale||1)===1&&right>left&&bottom>top&&callbacks.remaining()>0;
    const next={saveReceipts:!!callbacks.isSaved,viewportWidth:innerWidth,rect:[r.left,r.top,r.right,r.bottom],limit:[left,top,right,bottom],exclude,pressurePoints:!erasing&&!!callbacks.pressure?.(),width:(callbacks.width?.()??2.5)*r.width/800,color:'#31483b',tool,eraseRadius:18,liveErase:erasing&&!!callbacks.progress,enabled};
    const encoded=JSON.stringify(next);
    if(encoded===last)return;
    // Native captures geometry per stroke, so scrolling cannot re-anchor an existing stroke.
    last=encoded;
    try{send(ready?'configure':'open',next);}catch{useBrowser('native bridge unavailable');}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function mapPoints(msg){
    if(!Array.isArray(msg.rect)||msg.rect.length!==4||!msg.rect.every(Number.isFinite)||!Array.isArray(msg.points)||msg.points.length>24000||!msg.points.every(p=>Array.isArray(p)&&(p.length===2||(p.length===3&&p[2]>=0&&p[2]<=1))&&p.every(Number.isFinite)))return null;
    const [x,y,right]=msg.rect,width=right-x;if(!(width>0))return null;
    return {radius:18*800/width+1.25,points:msg.points.map(p=>[Math.round(Math.max(0,Math.min(800,(p[0]-x)*800/width))*10)/10,Math.round(Math.max(0,Math.min(callbacks.height(),(p[1]-y)*800/width))*10)/10,...(!erasing&&callbacks.pressure?.()&&p.length===3?[adjustedPressure(p[2],callbacks.sensitivity?.()??1)]:[])])};
  }
  function event(e){
    let msg;try{msg=JSON.parse(e.data);}catch{return;}
    if(msg.version!==1||msg.session!==session||disposed||fallback)return;
    if(msg.type==='save-state'){
      if(!Number.isSafeInteger(msg.pending)||msg.pending<0||!Number.isFinite(msg.age)||msg.age<0)return;
      if(msg.pending<savePending)savedMark+=savePending-msg.pending;
      savePending=msg.pending;saveSince=performance.now()-msg.age;paintSaveState();return;
    }
    if(msg.type==='ready'){
      clearTimeout(timeout);
      if(erasing&&msg.nativeEraser!==true){useBrowser('install BOOX Test 0.1.1 for native feedback');return;}
      ready=true;badge.textContent=erasing?'BOOX native eraser':'BOOX native pen';send('activate');return;
    }
    if(msg.type==='error'){useBrowser(msg.message||'native setup failed');return;}
    if(msg.type==='begin'){
      diagnostic.begun++;diagnostic.last='Pen stroke started';busy=true;gesture=Number.isSafeInteger(msg.id)?msg.id:null;lastBatch=0;
      callbacks.begin({native:true});return;
    }
    if(msg.type==='erase-progress'){
      if(!erasing||!callbacks.progress||!busy||msg.id!==gesture||!Number.isSafeInteger(msg.batch)||msg.batch<1)return;
      const ack=dirty=>send('erase-ack',{id:msg.id,batch:msg.batch,dirty});
      if(msg.batch<=lastBatch){ack(null);return;}
      const mapped=mapPoints(msg);if(!mapped){ack(null);return;}
      const bounds=callbacks.progress(mapped.points,{radius:mapped.radius});lastBatch=msg.batch;
      const [x,y,right]=msg.rect,scale=(right-x)/800;
      ack(bounds?[x+(bounds[0]-3)*scale,y+(bounds[1]-3)*scale,x+(bounds[2]+3)*scale,y+(bounds[3]+3)*scale]:null);return;
    }
    if(msg.type==='stroke'){
      const id=msg.id;
      diagnostic.received++;
      if(!Number.isSafeInteger(id)||!Array.isArray(msg.points)||!Array.isArray(msg.rect)){reject('Malformed native stroke message');return;}
      if(received.has(id)){send('ack',{id});return;}
      busy=false;
      const mapped=mapPoints(msg);
      if(!mapped){reject('Native coordinates could not be converted');send('ack',{id});return;}
      try{
        if((msg.tool||'pen')!==tool)reject('Stroke arrived for a different tool');
        else if(mapped.points.length>callbacks.remaining()){capacityBlocked=true;reject('Note capacity reached. This stroke was not saved. Use another note or erase some handwriting.');schedule();}
        else if(callbacks.complete(mapped.points,undefined,{radius:mapped.radius})===false)reject('Note rejected stroke; check the message below the note');
        else {awaitingSave.add(id);confirmSaved();diagnostic.accepted++;diagnostic.last='Accepted '+mapped.points.length+' points';}
      }catch(error){reject(error.message||'Stroke handling failed');}
      gesture=null;
      received.add(id);
      // DOM has permanent ink before native requests Android's visual-state callback.
      send('ack',{id});if(callbacks.remaining()===0)schedule();
    }
  }
  bridge.onmessage=event;
  const timeout=setTimeout(()=>useBrowser('native setup timed out'),2000);
  const resize=new ResizeObserver(schedule);resize.observe(svg);
  // Adding permanent ink must not remeasure every button in a large book.
  // Removal (Undo/Clear) can re-enable a full note, so still refresh then.
  const changes=new MutationObserver(records=>{if(records.some(r=>!svg.contains(r.target)||r.removedNodes.length))schedule();});changes.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','class','style']});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
  document.addEventListener('visibilitychange',schedule);visualViewport?.addEventListener('resize',schedule);
  schedule();
  return {
    confirmSaved,
    active:()=>fallback?fallback.active():busy,
    finish(){if(fallback)return fallback.finish();return !busy;},
    dispose(){if(disposed)return;disposed=true;clearTimeout(saveTimer);strip.remove();clearTimeout(timeout);cancelAnimationFrame(frame);resize.disconnect();changes.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);document.removeEventListener('visibilitychange',schedule);visualViewport?.removeEventListener('resize',schedule);fallback?.dispose();try{send('close');}catch{}if(bridge.onmessage===event)bridge.onmessage=null;badge.remove();}
  };
}
