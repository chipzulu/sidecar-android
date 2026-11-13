// Presentation-only positioning: page width and pagination never change.
export function positionWritingNote(box,viewport,reader){
 const layout=viewport.closest('.layout');
 viewport.style.removeProperty('--writing-shift');
 layout.classList.remove('writing-shifted');
 if(localStorage.getItem('sidecar-reader:writing-left')==='true'){
  const room=Math.max(0,viewport.getBoundingClientRect().left-layout.getBoundingClientRect().left);
  const shift=Math.min(96,room);
  viewport.style.setProperty('--writing-shift',shift+'px');
  layout.classList.toggle('writing-shifted',shift>0);
 }
 const bounds=box.getBoundingClientRect(),view=viewport.getBoundingClientRect();
 if(localStorage.getItem('sidecar-reader:writing-lift')!=='false'){
  // Spare scroll space lets even the final note rise, without altering page layout.
  viewport.style.paddingBottom=Math.ceil(view.height)+'px';
  const line=parseFloat(getComputedStyle(reader).lineHeight)||35;
  viewport.scrollTop=Math.max(0,viewport.scrollTop+bounds.top-view.top-3*line-12);
 }else if(bounds.height>view.height||bounds.top<view.top)viewport.scrollTop+=bounds.top-view.top;
 else if(bounds.bottom>view.bottom)viewport.scrollTop+=bounds.bottom-view.bottom;
}
export function finishWritingPosition(viewport){
 viewport.style.removeProperty('--writing-shift');viewport.closest('.layout')?.classList.remove('writing-shifted');
 // Retain spare scroll space until navigation to avoid a jump when accepting a note.
}
export function resetWritingPosition(viewport){finishWritingPosition(viewport);viewport.style.paddingBottom='';}
