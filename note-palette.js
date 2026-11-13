const ns='http://www.w3.org/2000/svg';
const paths={Pen:'M4 20l4-1 12-12-5-5L3 14z M13 4l5 5 M4 14l5 5',Eraser:'M3 14L13 4a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-8 8H8z M7 10l10 10 M13 20h9',Undo:'M9 5L3 11l6 6 M3 11h11a6 6 0 0 1 0 12',More:'M4 12h.1 M12 12h.1 M20 12h.1'};
export function notePalette({anchor,tool,setTool,undo,moreSpace,accept,more,onError}){
 const root=document.createElement('div');root.className='note-palette';root.setAttribute('role','toolbar');root.setAttribute('aria-label','Handwriting tools');
 const handle=document.createElement('button');handle.type='button';handle.className='palette-handle';handle.textContent='⠿';handle.title='Move tools (drag or arrow keys)';handle.setAttribute('aria-label','Move handwriting tools');root.append(handle);
 const buttons={};
 function button(label,icon,action){
  const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);
  if(paths[icon]){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 26 26');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(ns,'path');path.setAttribute('d',paths[icon]);svg.append(path);b.append(svg);}else b.textContent=icon;
  b.onclick=()=>{try{action(b);refresh();}catch(e){onError?.(e.message,true);}};root.append(b);buttons[label]=b;
 }
 button('Pen','Pen',()=>setTool('pen'));button('Eraser','Eraser',()=>setTool('eraser'));
 button('Undo','Undo',undo);button('More space','+',moreSpace);button('Accept edit','✓',accept);
 button('More note actions','⋯',b=>{const r=b.getBoundingClientRect();more(r.left,r.bottom);});
 document.body.append(root);
 let x=0,y=0,vertical=false,drag=null,saved=null;
 try{saved=JSON.parse(localStorage.getItem('sidecar-note-palette'));}catch{}
 const limits=()=>({left:8,top:Math.min(innerHeight-60,(document.querySelector('header')?.getBoundingClientRect().bottom||0)+8),right:innerWidth-8,bottom:innerHeight-8});
 function place(nx,ny,orient){
  if(orient!==undefined)vertical=orient;
  root.classList.toggle('vertical',vertical);root.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  const edge=limits();root.style.maxHeight=Math.max(44,edge.bottom-edge.top)+'px';const r=root.getBoundingClientRect();
  x=Math.max(edge.left,Math.min(nx,edge.right-r.width));y=Math.max(edge.top,Math.min(ny,edge.bottom-r.height));
  root.style.left=x+'px';root.style.top=y+'px';
 }
 function move(px,py){
  const side=Math.min(px,innerWidth-px);if(!vertical&&side<60)vertical=true;else if(vertical&&side>112)vertical=false;
  place(px-(drag?.dx||0),py-(drag?.dy||0),vertical);
 }
 function remember(){
  const edge=limits(),r=root.getBoundingClientRect();saved={x:(x-edge.left)/Math.max(1,edge.right-edge.left-r.width),y:(y-edge.top)/Math.max(1,edge.bottom-edge.top-r.height),vertical};
  try{localStorage.setItem('sidecar-note-palette',JSON.stringify(saved));}catch{}
 }
 function restore(){
  if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
   root.classList.toggle('vertical',!!saved.vertical);const edge=limits(),r=root.getBoundingClientRect();place(edge.left+saved.x*Math.max(0,edge.right-edge.left-r.width),edge.top+saved.y*Math.max(0,edge.bottom-edge.top-r.height),!!saved.vertical);
  }else {const r=anchor.getBoundingClientRect();place(r.left,r.top-56,false);}
 }
 handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();root.classList.add('dragging');const r=handle.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left+4,dy:e.clientY-r.top+4};handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();move(e.clientX,e.clientY);};
 handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=e=>{if(drag?.id===e.pointerId){drag=null;root.classList.remove('dragging');remember();}};
 handle.onkeydown=e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(delta){e.preventDefault();move(x+delta[0],y+delta[1]);remember();}};
 function refresh(){for(const name of ['Pen','Eraser'])buttons[name].setAttribute('aria-pressed',String(tool()===name.toLowerCase()));}
 window.addEventListener('resize',restore);restore();refresh();
 return {refresh,dispose(){window.removeEventListener('resize',restore);root.remove();}};
}
