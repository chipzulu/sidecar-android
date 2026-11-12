// Pen gestures on prose only. Ink pads keep their native input adapter.
export function annotationGestures(reader,{menu,select,cancel}){
 let mode=null,down=null,timer=0,suppress=0;
 function wordAt(x,y,point=false){
  const r=document.caretRangeFromPoint(x,y),node=r?.startContainer;
  if(node?.nodeType!==Node.TEXT_NODE)return null;
  const block=node.parentElement.closest('p[data-block]');if(!block||!reader.contains(block))return null;
  let a=Math.min(r.startOffset,node.length-1),b=a+1;if(a<0)return null;
  if(point){
   // Attach to the adjacent character without painting it. The prose owns the anchor.
   while(a<node.length&&/\s/.test(node.data[a]))a++;
   if(a===node.length){a=Math.min(r.startOffset,node.length)-1;while(a>=0&&/\s/.test(node.data[a]))a--;}
   if(a<0)return null;b=a+1;
  }else{if(/\s/.test(node.data[a])&&a>0)a--;while(a>0&&!/\s/.test(node.data[a-1]))a--;b=a+1;while(b<node.length&&!/\s/.test(node.data[b]))b++;}
  const range=document.createRange();range.setStart(node,a);range.setEnd(node,b);return {range,path:block.dataset.scene};
 }
 function joined(a,b){if(!a||!b||a.path!==b.path)return null;const earlier=a.range.compareBoundaryPoints(Range.START_TO_START,b.range)<=0;const first=earlier?a:b,last=earlier?b:a;const range=document.createRange();range.setStart(first.range.startContainer,first.range.startOffset);range.setEnd(last.range.endContainer,last.range.endOffset);return {range,path:a.path};}
 function reset(){clearTimeout(timer);down=null;CSS.highlights?.delete('annotation-drag');}
 function setMode(value){reset();mode=value;reader.classList.toggle('annotation-highlighting',!!mode);}
 document.addEventListener('pointerdown',e=>{suppress=0;if(mode&&!e.target.closest('p[data-block]')){setMode(null);cancel();}},true);
 reader.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.ink-note,button,input,textarea,select'))return;
  const word=wordAt(e.clientX,e.clientY);if(!word)return;
  down={x:e.clientX,y:e.clientY,word,id:e.pointerId,moved:false};
  if(mode||e.pointerType==='pen')e.preventDefault();
  if(mode){reader.setPointerCapture(e.pointerId);return;}
  timer=setTimeout(()=>{
   if(!down)return;const at=wordAt(down.x,down.y,true);suppress=performance.now()+700;
   menu(down.x,down.y,at);reset();
  },600);
 });
 reader.addEventListener('pointermove',e=>{
  if(!down||down.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7){down.moved=true;clearTimeout(timer);}
  if(!mode)return;e.preventDefault();const span=joined(down.word,wordAt(e.clientX,e.clientY));
  if(span&&window.Highlight)CSS.highlights?.set('annotation-drag',new Highlight(span.range));
 });
 reader.addEventListener('pointerup',e=>{
  if(!down||down.id!==e.pointerId)return;clearTimeout(timer);
  if(mode){
   e.preventDefault();suppress=performance.now()+500;
   const span=down.moved&&joined(down.word,wordAt(e.clientX,e.clientY)),write=mode==='note';setMode(null);
   if(span)select(span,write);else cancel();
  }reset();
 });
 reader.addEventListener('pointercancel',reset);
 reader.addEventListener('click',e=>{if(performance.now()<suppress){e.preventDefault();e.stopImmediatePropagation();}},true);
 reader.addEventListener('contextmenu',e=>{if(e.target.closest('.ink-note'))return;e.preventDefault();const at=wordAt(e.clientX,e.clientY,true);if(at){menu(e.clientX,e.clientY,at);reset();}});
 return {setMode,pointAt:(x,y)=>wordAt(x,y,true)};
}
