// Copy is a selection action, not a permanent editing toolbar button.
export function mountSelectionCopy({reader,beforeShow,status}){
 const popup=document.createElement('aside');popup.className='selection-copy-popup';popup.hidden=true;
 const button=document.createElement('button');button.type='button';button.textContent='Copy';button.title='Copy selected text';popup.append(button);document.body.append(popup);
 let text='',timer=0,source=null;
 const hide=()=>{popup.hidden=true;text='';source=null;};
 function show(value,rect,origin='conversion'){if(!value){hide();return;}if(beforeShow?.()===false)return;text=value;source=origin;popup.hidden=false;const box=popup.getBoundingClientRect();popup.style.left=Math.max(6,Math.min(rect.right-box.width,innerWidth-box.width-6))+'px';popup.style.top=Math.max(6,Math.min(rect.top-box.height-5,innerHeight-box.height-6))+'px';}
 button.onpointerdown=e=>e.preventDefault();
 button.onclick=async()=>{const selected=text;try{await navigator.clipboard.writeText(selected);status('Selection copied.');hide();}catch{status('Could not copy. Try the system Copy command.',true);}};
 function manuscriptSelection(){const selection=getSelection();if(!selection?.rangeCount||selection.isCollapsed){if(source==='manuscript')hide();return;}const range=selection.getRangeAt(0);const prose=n=>(n.nodeType===3?n.parentElement:n).closest?.('p[data-block]');if(reader.contains(range.startContainer)&&reader.contains(range.endContainer)&&prose(range.startContainer)&&prose(range.endContainer))show(selection.toString(),range.getBoundingClientRect(),'manuscript');}
 document.addEventListener('selectionchange',()=>{clearTimeout(timer);timer=setTimeout(manuscriptSelection,120);});
 reader.addEventListener('pointerup',()=>{clearTimeout(timer);timer=setTimeout(manuscriptSelection,0);});
 document.addEventListener('pointerdown',e=>{clearTimeout(timer);if(!popup.contains(e.target))hide();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('contextmenu',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
 return {show,hide};
}
