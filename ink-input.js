import {appendStroke} from './shared/annotation-ink.js';

// Browser adapter only. Completed strokes use note coordinates, independent of DOM pixels.
export function browserInkInput(svg, {height, remaining, begin, complete}) {
  let stroke=null, line, pointer, rect, frame=0;
  function paint(){frame=0;if(line&&stroke)line.setAttribute('points',stroke.length===1?`${stroke[0]} ${stroke[0][0]+.1},${stroke[0][1]}`:stroke.map(p=>p.join(',')).join(' '));}
  function point(e){const scale=800/rect.width;return [Math.round(Math.max(0,Math.min(800,(e.clientX-rect.left)*scale))*10)/10,Math.round(Math.max(0,Math.min(height(),(e.clientY-rect.top)*scale))*10)/10];}
  function add(e){if(stroke.length>=remaining())return;const p=point(e),last=stroke.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])>=.8)stroke.push(p);}
  svg.onpointerdown=e=>{
    if(stroke||e.pointerType==='touch'||e.button!==0||remaining()<1)return;
    e.preventDefault();begin();rect=svg.getBoundingClientRect();pointer=e.pointerId;
    svg.setPointerCapture(pointer);stroke=[point(e)];line=appendStroke(svg,stroke);
  };
  svg.onpointermove=e=>{
    if(!stroke||e.pointerId!==pointer)return;e.preventDefault();
    const events=e.getCoalescedEvents?.();for(const sample of events?.length?events:[e])add(sample);
    if(!frame)frame=requestAnimationFrame(paint);
  };
  function finish(e){
    if(!stroke||(e&&e.pointerId!==pointer))return;
    if(e?.type==='pointerup')add(e);
    cancelAnimationFrame(frame);paint();const points=stroke,element=line;stroke=null;line=null;
    if(!complete(points,element))element.remove();
  }
  svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=finish;
  return {finish,active:()=>!!stroke,dispose(){finish();cancelAnimationFrame(frame);svg.onpointerdown=svg.onpointermove=svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=null;}};
}
