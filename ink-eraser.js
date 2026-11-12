// Swept-circle hit testing includes the segments between sampled points.
function distance2(p,a,b){
  const x=b[0]-a[0],y=b[1]-a[1],len=x*x+y*y;
  const t=len?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/len)):0;
  return (p[0]-a[0]-t*x)**2+(p[1]-a[1]-t*y)**2;
}
function crosses(a,b,c,d){
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
  return ((x<0&&y>0)||(x>0&&y<0))&&((z<0&&w>0)||(z>0&&w<0));
}
export function strokeTouchesSweep(stroke,a,b,radius){
  const r2=radius*radius;
  for(let i=0;i<stroke.length;i++){
    const c=stroke[i],d=stroke[Math.min(i+1,stroke.length-1)];
    if(crosses(a,b,c,d)||Math.min(distance2(c,a,b),distance2(d,a,b),distance2(a,c,d),distance2(b,c,d))<=r2)return true;
  }
  return false;
}

// Native raw drawing is closed while this adapter is active. Erasing never draws ink.
export function eraserInput(svg,{begin,sweep,end}){
  const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
  circle.setAttribute('fill','#41695318');circle.setAttribute('stroke','#416953');
  circle.setAttribute('stroke-width','1.5');circle.style.pointerEvents='none';circle.style.display='none';
  svg.append(circle);svg.style.cursor='none';
  let pointer=null,last=null;
  function position(e){const r=svg.getBoundingClientRect(),scale=800/r.width;return {point:[(e.clientX-r.left)*scale,(e.clientY-r.top)*scale],radius:18*scale};}
  function move(e,erase=false){
    const {point,radius}=position(e);circle.style.display='';circle.setAttribute('cx',point[0]);circle.setAttribute('cy',point[1]);circle.setAttribute('r',radius);
    if(erase){sweep(last||point,point,radius+1.25);last=point;}
  }
  svg.onpointerdown=e=>{
    if(e.pointerType==='touch'||e.button!==0||pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;svg.setPointerCapture(pointer);last=null;begin();move(e,true);
  };
  svg.onpointermove=e=>{
    if(e.pointerType==='touch'||(pointer!==null&&pointer!==e.pointerId))return;
    if(pointer!==null){e.preventDefault();const samples=e.getCoalescedEvents?.();for(const p of samples?.length?samples:[e])move(p,true);}else move(e);
  };
  function finish(e){
    if(pointer===null||(e&&e.pointerId!==pointer))return;
    if(e?.type==='pointerup')move(e,true);
    pointer=null;last=null;end();
  }
  svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=finish;
  svg.onpointerleave=()=>{if(pointer===null)circle.style.display='none';};
  return {active:()=>pointer!==null,finish,dispose(){finish();circle.remove();svg.style.cursor='';svg.onpointerdown=svg.onpointermove=svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=svg.onpointerleave=null;}};
}
