// An octagon swept between pen samples: bounds first, then odd/even ray crossings.
const corners=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4),Math.sin(i*Math.PI/4)]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const within=(p,a,b)=>p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
function crosses(a,b,c,d){
 const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
 return (((x<0&&y>0)||(x>0&&y<0))&&((z<0&&w>0)||(z>0&&w<0)))||
   (Math.abs(x)<1e-8&&within(c,a,b))||(Math.abs(y)<1e-8&&within(d,a,b))||
   (Math.abs(z)<1e-8&&within(a,c,d))||(Math.abs(w)<1e-8&&within(b,c,d));
}
export function pointInPolygon(point,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i];
  if(Math.abs(cross(a,b,point))<1e-8&&within(point,a,b))return true;
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function eraserSweep(a,b,radius){
 const points=[...corners.map(p=>[a[0]+p[0]*radius,a[1]+p[1]*radius]),...corners.map(p=>[b[0]+p[0]*radius,b[1]+p[1]*radius])].sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
 const half=list=>{const result=[];for(const p of list){while(result.length>1&&cross(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}return result;};
 const lo=half(points),hi=half([...points].reverse());lo.pop();hi.pop();
 return {polygon:lo.concat(hi),bounds:[Math.min(a[0],b[0])-radius,Math.min(a[1],b[1])-radius,Math.max(a[0],b[0])+radius,Math.max(a[1],b[1])+radius]};
}
const strokeBounds=new WeakMap();
export function prepareStroke(stroke){
 if(!strokeBounds.has(stroke)){
  const box=[Infinity,Infinity,-Infinity,-Infinity];
  for(const p of stroke){box[0]=Math.min(box[0],p[0]);box[1]=Math.min(box[1],p[1]);box[2]=Math.max(box[2],p[0]);box[3]=Math.max(box[3],p[1]);}
  strokeBounds.set(stroke,box);
 }
 return strokeBounds.get(stroke);
}
export function strokeTouchesSweep(stroke,a,b,radius){
 const {polygon,bounds}=a.polygon?a:eraserSweep(a,b,radius),box=prepareStroke(stroke);
 if(box[2]<bounds[0]||box[0]>bounds[2]||box[3]<bounds[1]||box[1]>bounds[3])return false;
 for(let i=0;i<stroke.length;i++){
  const c=stroke[i];if(pointInPolygon(c,polygon))return true;
  if(i)for(let j=0;j<polygon.length;j++)if(crosses(stroke[i-1],c,polygon[j],polygon[(j+1)%polygon.length]))return true;
 }
 return false;
}

// Keep all sampled segments for hit testing, but paint and measure at most once per frame.
export function eraserInput(svg,{begin,sweep,end}){
 const cursor=document.createElementNS('http://www.w3.org/2000/svg','polygon');
 cursor.setAttribute('points',corners.map(p=>p.join(',')).join(' '));
 cursor.setAttribute('fill','none');cursor.setAttribute('stroke','#416953');
 cursor.setAttribute('stroke-width','1.5');cursor.setAttribute('vector-effect','non-scaling-stroke');
 cursor.style.pointerEvents='none';cursor.style.display='none';svg.append(cursor);svg.style.cursor='none';
 let pointer=null,last=null,geometry=null,frame=0,queue=[],hover=null;
 const readGeometry=()=>{const r=svg.getBoundingClientRect();return {x:r.left,y:r.top,scale:800/r.width};};
 function point(e){return [(e.clientX-geometry.x)*geometry.scale,(e.clientY-geometry.y)*geometry.scale];}
 function flush(){
  cancelAnimationFrame(frame);frame=0;
  if(!queue.length&&!hover)return;
  geometry ||= readGeometry();
  const radius=18*geometry.scale;
  for(const p of queue){sweep(last||p,p,radius+1.25);last=p;}
  const p=queue.at(-1)||hover;queue=[];hover=null;
  cursor.style.display='';cursor.setAttribute('transform',`translate(${p[0]} ${p[1]}) scale(${radius})`);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(flush);}
 svg.onpointerdown=e=>{
  if(e.pointerType==='touch'||e.button!==0||pointer!==null)return;
  e.preventDefault();geometry=readGeometry();pointer=e.pointerId;svg.setPointerCapture(pointer);last=null;begin();queue.push(point(e));schedule();
 };
 svg.onpointermove=e=>{
  if(e.pointerType==='touch'||(pointer!==null&&pointer!==e.pointerId))return;
  geometry ||= readGeometry();
  if(pointer!==null){e.preventDefault();const samples=e.getCoalescedEvents?.();for(const p of samples?.length?samples:[e])queue.push(point(p));}
  else hover=point(e);
  schedule();
 };
 function finish(e){
  if(pointer===null||(e&&e.pointerId!==pointer))return;
  if(e?.type==='pointerup')queue.push(point(e));flush();pointer=null;last=null;end();
 }
 svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=finish;
 svg.onpointerleave=()=>{if(pointer===null){cancelAnimationFrame(frame);frame=0;hover=null;geometry=null;cursor.style.display='none';}};
 function invalidate(){finish();geometry=null;}
 window.addEventListener('scroll',invalidate,true);window.addEventListener('resize',invalidate);
 return {active:()=>pointer!==null,finish,dispose(){finish();cancelAnimationFrame(frame);cursor.remove();svg.style.cursor='';window.removeEventListener('scroll',invalidate,true);window.removeEventListener('resize',invalidate);svg.onpointerdown=svg.onpointermove=svg.onpointerup=svg.onpointercancel=svg.onlostpointercapture=svg.onpointerleave=null;}};
}
