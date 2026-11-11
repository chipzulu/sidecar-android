import {browserInkInput} from './ink-input.js';

// Protocol 1 uses CSS viewport pixels; the native host converts to physical view pixels.
export function adaptiveInkInput(svg, callbacks) {
  const bridge=window.SidecarNativePen;
  if(!bridge?.postMessage)return browserInkInput(svg,callbacks);
  const session=crypto.randomUUID();
  let fallback=null,ready=false,disposed=false,busy=false,frame=0,last='';
  const received=new Set();
  const badge=document.createElement('small');badge.textContent='Connecting BOOX pen…';svg.before(badge);
  function send(type,extra={}){bridge.postMessage(JSON.stringify({version:1,type,session,...extra}));}
  function useBrowser(reason){
    if(disposed||fallback)return;
    try{send('close');}catch{}
    ready=false;busy=false;fallback=browserInkInput(svg,callbacks);
    badge.textContent='Browser pen'+(reason?' — '+reason:'');
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
    for(const el of document.querySelectorAll('button,input,textarea,select,a,[role="button"],dialog[open],header')){
      const b=el.getBoundingClientRect();if(b.width&&b.height)exclude.push([b.left,b.top,b.right,b.bottom]);
    }
    const enabled=!document.hidden&&!document.querySelector('dialog[open]')&&(visualViewport?.scale||1)===1&&right>left&&bottom>top&&callbacks.remaining()>0;
    const next={viewportWidth:innerWidth,rect:[r.left,r.top,r.right,r.bottom],limit:[left,top,right,bottom],exclude,width:2.5*r.width/800,color:'#31483b',enabled};
    const encoded=JSON.stringify(next);
    if(encoded===last)return;
    // Native captures geometry per stroke, so scrolling cannot re-anchor an existing stroke.
    last=encoded;
    try{send(ready?'configure':'open',next);}catch{useBrowser('native bridge unavailable');}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function event(e){
    let msg;try{msg=JSON.parse(e.data);}catch{return;}
    if(msg.version!==1||msg.session!==session||disposed||fallback)return;
    if(msg.type==='ready'){
      clearTimeout(timeout);ready=true;badge.textContent='BOOX native pen';send('activate');return;
    }
    if(msg.type==='error'){useBrowser(msg.message||'native setup failed');return;}
    if(msg.type==='begin'){busy=true;callbacks.begin();return;}
    if(msg.type==='stroke'){
      const id=msg.id;
      if(!Number.isSafeInteger(id)||!Array.isArray(msg.points)||!Array.isArray(msg.rect))return;
      if(received.has(id)){send('ack',{id});return;}
      busy=false;
      const [x,y,right]=msg.rect,width=right-x;
      if(!(width>0)||!msg.rect.every(Number.isFinite)||msg.points.length>24000||!msg.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))){send('ack',{id});return;}
      const points=msg.points.map(p=>[Math.round(Math.max(0,Math.min(800,(p[0]-x)*800/width))*10)/10,Math.round(Math.max(0,Math.min(callbacks.height(),(p[1]-y)*800/width))*10)/10]);
      if(points.length<=callbacks.remaining())callbacks.complete(points);
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
    active:()=>fallback?fallback.active():busy,
    finish(){if(fallback)return fallback.finish();return !busy;},
    dispose(){if(disposed)return;disposed=true;clearTimeout(timeout);cancelAnimationFrame(frame);resize.disconnect();changes.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);document.removeEventListener('visibilitychange',schedule);visualViewport?.removeEventListener('resize',schedule);fallback?.dispose();try{send('close');}catch{}if(bridge.onmessage===event)bridge.onmessage=null;badge.remove();}
  };
}
