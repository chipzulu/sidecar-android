import {inkSvg,appendStroke,validInk} from './shared/annotation-ink.js';

export function inkPad(host, initial, save) {
  let ink = structuredClone(initial || {version:1,width:800,height:300,strokes:[]});
  if(!validInk(ink))throw Error('Invalid handwriting data.');
  let stroke=null,line,pointer,geometry,frame=0,drawn=0,timer=0;
  let pointCount=ink.strokes.reduce((count,s)=>count+s.length,0);
  const svg=inkSvg(ink);
  svg.setAttribute('aria-label','Write your annotation with a pen');
  const toolbar=document.createElement('div'),status=document.createElement('small');
  toolbar.className='ink-actions';status.setAttribute('role','status');
  function button(label,action){
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.onclick=()=>{if(!stroke)action();};toolbar.append(b);
  }
  function persist(finalize=false){
    try{
      // Committed arrays are immutable. Only the unfinished stroke is mutable.
      save(ink,finalize);
      if(status.textContent!=='Saved on this device')status.textContent='Saved on this device';
      return true;
    }catch(e){status.textContent='Could not save handwriting: '+e.message;return false;}
  }
  function scheduleMerge(){
    clearTimeout(timer);
    timer=setTimeout(()=>{timer=0;if(!stroke)persist(true);},650);
  }
  function resized(){svg.setAttribute('viewBox','0 0 800 '+ink.height);}
  button('Undo stroke',()=>{
    if(!ink.strokes.length)return;
    const previous=ink;
    ink={...ink,strokes:ink.strokes.slice(0,-1)};
    if(persist()){
      pointCount-=previous.strokes.at(-1).length;svg.lastElementChild.remove();scheduleMerge();
    }else ink=previous;
  });
  button('More space',()=>{
    const previous=ink;ink={...ink,height:Math.min(12000,ink.height+200)};
    if(persist()){resized();scheduleMerge();}else ink=previous;
  });
  button('Clear handwriting',()=>{
    if(!ink.strokes.length||!confirm('Clear the handwriting in this annotation?'))return;
    const previous=ink;ink={version:1,width:800,height:300,strokes:[]};
    if(persist()){svg.replaceChildren();pointCount=0;resized();scheduleMerge();}else ink=previous;
  });
  function point(e){
    return [
      Math.round(Math.max(0,Math.min(800,(e.clientX-geometry.left)*geometry.scale))*10)/10,
      Math.round(Math.max(0,Math.min(ink.height,(e.clientY-geometry.top)*geometry.scale))*10)/10
    ];
  }
  function add(e){
    if(pointCount+stroke.length>=24000)return;
    const p=point(e),last=stroke.at(-1);
    if(Math.hypot(p[0]-last[0],p[1]-last[1])>=.8)stroke.push(p);
  }
  function paint(){
    frame=0;
    if(!stroke||stroke.length===1)return;
    // The second initial point makes a pen tap visible as a dot.
    if(drawn===1&&line.points.numberOfItems===2)line.points.removeItem(1);
    while(drawn<stroke.length){
      const p=svg.createSVGPoint();[p.x,p.y]=stroke[drawn++];line.points.appendItem(p);
    }
  }
  svg.onpointerdown=e=>{
    if(stroke||e.pointerType==='touch'||e.button!==0)return;
    if(ink.strokes.length>=2000||pointCount>=24000){status.textContent='This note is full. Start another annotation.';return;}
    e.preventDefault();clearTimeout(timer);timer=0;
    pointer=e.pointerId;svg.setPointerCapture(pointer);
    const bounds=svg.getBoundingClientRect();
    geometry={left:bounds.left,top:bounds.top,scale:800/bounds.width};
    stroke=[point(e)];drawn=1;line=appendStroke(svg,stroke);
  };
  svg.onpointermove=e=>{
    if(!stroke||pointer!==e.pointerId)return;
    e.preventDefault();
    const coalesced=e.getCoalescedEvents?.()||[];
    for(const event of coalesced.length?coalesced:[e])add(event);
    if(!frame)frame=requestAnimationFrame(paint);
  };
  function finish(e){
    if(!stroke||pointer!==e.pointerId)return;
    if(e.type==='pointerup')add(e);
    cancelAnimationFrame(frame);paint();
    const completed=stroke;stroke=null;pointCount+=completed.length;
    ink={...ink,strokes:[...ink.strokes,completed]};
    const grow=completed.some(p=>p[1]>ink.height-60)&&ink.height<12000;
    if(grow)ink={...ink,height:Math.min(12000,ink.height+150)};
    persist();
    if(grow)resized();
    scheduleMerge();
  }
  svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=finish;
  host.append(toolbar,svg,status);
  return {save:()=>{
    if(stroke)finish({pointerId:pointer});
    clearTimeout(timer);timer=0;return persist(true);
  }};
}
