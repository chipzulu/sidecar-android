import {inkSvg} from './shared/annotation-ink.js';
export function resolveAnnotationConflict(local,remote){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='annotation-conflict';dialog.setAttribute('aria-label','Resolve annotation conflict');
  const title=document.createElement('h2');title.textContent='Choose the annotation to keep';
  const info=document.createElement('p');info.textContent='GitHub has a different copy. This can happen after resetting or downloading a book; it does not prove another device edited it. Cancel keeps both copies unchanged.';
  const previews=document.createElement('div');previews.className='conflict-previews';
  for(const [name,note] of [['Tablet',local],['GitHub',remote]]){const section=document.createElement('section'),h=document.createElement('h3'),quote=document.createElement('blockquote'),body=document.createElement('p');h.textContent=name;quote.textContent=note.quote;body.textContent=note.body||'(No typed note)';section.append(h,quote,body);if(note.ink)section.append(inkSvg(note.ink));previews.append(section);}
  dialog.append(title,info,previews);
  function finish(choice){dialog.close();dialog.remove();resolve(choice);}
  for(const [label,value] of [['Keep tablet version','tablet'],['Keep GitHub version','remote'],['Cancel','cancel']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>finish(value);dialog.append(b);}
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish('cancel');});document.body.append(dialog);dialog.showModal();dialog.lastChild.focus();
 });
}
