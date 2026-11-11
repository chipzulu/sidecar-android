import {inkSvg,appendStroke,validInk} from './shared/annotation-ink.js';

export function inkPad(host, initial, save) {
  let ink = structuredClone(initial || {version:1,width:800,height:300,strokes:[]});
  let stroke = null, line, pointer;
  const svg = inkSvg(ink);
  svg.setAttribute('aria-label','Write your annotation with a pen');
  const toolbar = document.createElement('div'), status = document.createElement('small');
  toolbar.className = 'ink-actions';
  status.setAttribute('role','status');
  function button(label, action) {
    const b = document.createElement('button'); b.type='button';b.textContent=label;
    b.onclick=()=>{if(!stroke)action();};toolbar.append(b);
  }
  function persist() {
    try {save(structuredClone(ink));status.textContent='Saved on this device';return true;}
    catch(e){status.textContent='Could not save handwriting: '+e.message;return false;}
  }
  function redraw() {
    svg.replaceChildren();for(const points of ink.strokes)appendStroke(svg,points);
    svg.setAttribute('viewBox','0 0 800 '+ink.height);
  }
  button('Undo stroke',()=>{
    const previous=structuredClone(ink);ink.strokes.pop();
    if(!persist())ink=previous;redraw();
  });
  button('More space',()=>{
    ink.height=Math.min(12000,ink.height+200);persist();redraw();
  });
  button('Clear handwriting',()=>{
    if(!ink.strokes.length||!confirm('Clear the handwriting in this annotation?'))return;
    const previous=ink;ink={version:1,width:800,height:300,strokes:[]};
    if(!persist())ink=previous;redraw();
  });
  function point(e){
    const r=svg.getBoundingClientRect(),scale=800/r.width;
    return [Math.round(Math.max(0,Math.min(800,(e.clientX-r.left)*scale))*10)/10,
      Math.round(Math.max(0,Math.min(ink.height,(e.clientY-r.top)*scale))*10)/10];
  }
  svg.onpointerdown=e=>{
    if(stroke||e.pointerType==='touch'||e.button!==0)return;
    e.preventDefault();pointer=e.pointerId;svg.setPointerCapture(pointer);
    stroke=[point(e)];line=appendStroke(svg,stroke);status.textContent='';
  };
  svg.onpointermove=e=>{
    if(!stroke||pointer!==e.pointerId)return;
    e.preventDefault();
    for(const event of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e]){
      if(stroke.length>=24000)break;
      const p=point(event),last=stroke.at(-1);
      if(Math.hypot(p[0]-last[0],p[1]-last[1])>=.8)stroke.push(p);
    }
    line.setAttribute('points',stroke.map(p=>p.join(',')).join(' '));
  };
  function finish(e){
    if(!stroke||pointer!==e.pointerId)return;
    const next={...ink,strokes:[...ink.strokes,stroke]};
    stroke=null;
    if(!validInk(next)){line.remove();status.textContent='This note is full. Start another annotation.';return;}
    ink=next;
    // Add room after lifting the pen so the writing surface stays still mid-stroke.
    if(ink.strokes.at(-1).some(p=>p[1]>ink.height-60))ink.height=Math.min(12000,ink.height+150);
    persist();redraw();
  }
  svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=finish;
  host.append(toolbar,svg,status);
  return {save:()=>{if(stroke)finish({pointerId:pointer});return persist();}};
}
