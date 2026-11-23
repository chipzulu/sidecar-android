export function targetAtCaret(caret){
 const node=caret?.startContainer;
 const block=(node?.nodeType===Node.TEXT_NODE?node.parentElement:node)?.closest('p[data-block]');
 if(!block)return null;
 const at={path:block.dataset.scene,range:caret.cloneRange(),caret:caret.cloneRange(),word:null};
 if(node.nodeType!==Node.TEXT_NODE || !node.length)return at;
 let i=Math.min(caret.startOffset,node.length-1);
 if(/\s/.test(node.data[i])){
  let next=i;while(next<node.length && /\s/.test(node.data[next]))next++;
  if(next<node.length)i=next;else while(i>=0 && /\s/.test(node.data[i]))i--;
 }
 if(i<0)return at;
 at.range.setStart(node,i);at.range.setEnd(node,i+1);
 let left=i,right=i+1;
 while(left>0 && !/\s/.test(node.data[left-1]))left--;
 while(right<node.length && !/\s/.test(node.data[right]))right++;
 at.word=at.range.cloneRange();at.word.setStart(node,left);at.word.setEnd(node,right);
 return at;
}
// Pen gestures on prose only. Ink pads keep their native input adapter.
export function annotationGestures(reader,{menu,enabled}){
 let down=null,suppress=0;
 function atPoint(x,y){
  const hit=document.elementFromPoint(x,y),block=hit?.closest('p[data-block]');
  if(!block||!reader.contains(block))return null;
  const r=document.caretRangeFromPoint(x,y);
  if(!r||!block.contains(r.startContainer))return null;
  return {...targetAtCaret(r),hit};
 }
 function joined(a,b){
  if(!a?.word||!b?.word||a.path!==b.path)return null;
  const forward=a.word.compareBoundaryPoints(Range.START_TO_START,b.word)<=0;
  const first=forward?a.word:b.word,last=forward?b.word:a.word;
  const range=first.cloneRange();range.setEnd(last.endContainer,last.endOffset);return range;
 }
 function reset(){down=null;CSS.highlights?.delete('annotation-drag');}
 function prose(e){return enabled() && !e.target.closest('.ink-note,button,input,textarea,select');}
 reader.addEventListener('pointerover',e=>{
  if(!down)reader.classList.toggle('annotation-highlighting',e.pointerType==='pen');
 });
 reader.addEventListener('pointerdown',e=>{
  if(!e.isPrimary || e.button!==0 || !prose(e))return;
  suppress=0;
  const at=atPoint(e.clientX,e.clientY);if(!at)return;
  down={id:e.pointerId,x:e.clientX,y:e.clientY,at,moved:false};
  if(e.pointerType!=='touch'){e.preventDefault();reader.setPointerCapture(e.pointerId);}
 });
 reader.addEventListener('pointermove',e=>{
  if(down?.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;
  if(!down.moved || e.pointerType==='touch')return;
  const span=joined(down.at,atPoint(e.clientX,e.clientY));
  if(span && window.Highlight)CSS.highlights?.set('annotation-drag',new Highlight(span));
 });
 reader.addEventListener('pointerup',e=>{
  if(down?.id!==e.pointerId)return;
  const start=down;reset();
  if(start.moved && e.pointerType==='touch')return;
  const at=atPoint(e.clientX,e.clientY);
  if(!at || at.path!==start.at.path)return;
  if(start.moved){
   at.selection=joined(start.at,at);if(!at.selection)return;
  }
  suppress=performance.now()+650;
  menu(e.clientX,e.clientY,at);
 });
 reader.addEventListener('pointercancel',e=>{if(down?.id===e.pointerId)reset();});
 reader.addEventListener('click',e=>{if(performance.now()<suppress && prose(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
 reader.addEventListener('contextmenu',e=>{
  if(!prose(e))return;
  e.preventDefault();if(down)return;
  const at=atPoint(e.clientX,e.clientY);
  if(at)menu(e.clientX,e.clientY,at);
 });
 return {reset};
}
