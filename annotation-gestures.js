// Pen gestures on prose only. Ink pads keep their native input adapter.
export function annotationGestures(reader,{menu,enabled}){
 let down=null,suppress=0;
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
  const range=document.createRange();range.setStart(node,a);range.setEnd(node,b);return {range,caret:r.cloneRange(),path:block.dataset.scene};
 }
 function joined(a,b){if(!a||!b||a.path!==b.path)return null;const earlier=a.range.compareBoundaryPoints(Range.START_TO_START,b.range)<=0;const first=earlier?a:b,last=earlier?b:a;const range=document.createRange();range.setStart(first.range.startContainer,first.range.startOffset);range.setEnd(last.range.endContainer,last.range.endOffset);return {range,path:a.path};}
 function reset(){down=null;CSS.highlights?.delete('annotation-drag');}
 function prose(e){return enabled() && !e.target.closest('.ink-note,button,input,textarea,select,[data-working-draft]');}
 reader.addEventListener('pointerover',e=>{
  if(!down)reader.classList.toggle('annotation-highlighting',e.pointerType==='pen');
 });
 reader.addEventListener('pointerdown',e=>{
  if(!e.isPrimary || e.button!==0 || !prose(e))return;
  suppress=0;
  const word=wordAt(e.clientX,e.clientY);if(!word)return;
  down={id:e.pointerId,x:e.clientX,y:e.clientY,word,moved:false};
  if(e.pointerType!=='touch'){e.preventDefault();reader.setPointerCapture(e.pointerId);}
 });
 reader.addEventListener('pointermove',e=>{
  if(down?.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;
  if(!down.moved || e.pointerType==='touch')return;
  const span=joined(down.word,wordAt(e.clientX,e.clientY));
  if(span && window.Highlight)CSS.highlights?.set('annotation-drag',new Highlight(span.range));
 });
 reader.addEventListener('pointerup',e=>{
  if(down?.id!==e.pointerId)return;
  const start=down;reset();
  if(start.moved && e.pointerType==='touch')return;
  const at=wordAt(e.clientX,e.clientY,true);
  if(!at || at.path!==start.word.path)return;
  at.word=start.word.range;
  if(start.moved){
   const span=joined(start.word,wordAt(e.clientX,e.clientY));if(!span)return;
   at.selection=span.range;
  }
  suppress=performance.now()+650;
  menu(e.clientX,e.clientY,at);
 });
 reader.addEventListener('pointercancel',e=>{if(down?.id===e.pointerId)reset();});
 reader.addEventListener('click',e=>{if(performance.now()<suppress && prose(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
 reader.addEventListener('contextmenu',e=>{
  if(!prose(e))return;
  e.preventDefault();if(down)return;
  const at=wordAt(e.clientX,e.clientY,true);
  if(at){at.word=wordAt(e.clientX,e.clientY).range;menu(e.clientX,e.clientY,at);}
 });
 return {reset};
}
