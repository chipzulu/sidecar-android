// Copy is a selection action, not a permanent editing toolbar button.
export function mountSelectionCopy({reader,onManuscriptSelection,status}){
 const popup=document.createElement('aside');popup.className='selection-copy-popup';popup.hidden=true;
 const button=document.createElement('button');button.type='button';button.textContent='Copy';button.title='Copy selected text';popup.append(button);document.body.append(popup);
 let text='',timer=0,dragging=false;
 const hide=()=>{popup.hidden=true;text='';};
 function show(value,rect){if(!value){hide();return;}text=value;popup.hidden=false;const box=popup.getBoundingClientRect();popup.style.left=Math.max(6,Math.min(rect.right-box.width,innerWidth-box.width-6))+'px';popup.style.top=Math.max(6,Math.min(rect.top-box.height-5,innerHeight-box.height-6))+'px';}
 button.onpointerdown=e=>e.preventDefault();
 button.onclick=async()=>{const selected=text;try{await navigator.clipboard.writeText(selected);status('Selection copied.');hide();}catch{status('Could not copy. Try the system Copy command.',true);}};
 function manuscriptSelection(){
  const selection=getSelection();if(dragging||!selection?.rangeCount||selection.isCollapsed)return;
  const range=selection.getRangeAt(0);
  if(reader.contains(range.commonAncestorContainer))onManuscriptSelection(range.cloneRange());
 }
 document.addEventListener('selectionchange',()=>{clearTimeout(timer);timer=setTimeout(manuscriptSelection,120);});
 document.addEventListener('pointerup',()=>{dragging=false;clearTimeout(timer);timer=setTimeout(manuscriptSelection,0);});
 document.addEventListener('pointercancel',()=>{dragging=false;});
 document.addEventListener('pointerdown',e=>{dragging=reader.contains(e.target);clearTimeout(timer);if(!popup.contains(e.target))hide();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('contextmenu',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
 return {show,hide};
}
