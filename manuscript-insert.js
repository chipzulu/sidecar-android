import {draftTextHtml,assimilateDraft} from './shared/working-draft.js';
import {inlineFragment,annotatedHtml,sceneNotes} from './inline-notes.js';
import {storeAnnotatedScene} from './writing.js';
import {tabletTextAllowed} from './shared/book-workflow.js';
export function insertManuscriptDialog(book,scenes,{text='',path,index=0,working=true}={},changed){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 const dialog=document.createElement('dialog');dialog.className='working-draft-dialog';dialog.innerHTML='<h2>Insert manuscript text</h2><label>Scene <select data-scene></select></label><p><label>Insert after <select data-position></select></label></p><textarea aria-label="Text to insert"></textarea><p data-status role="status"></p><button data-normal>Insert normally</button><button data-draft>Insert as working draft</button><button data-close>Cancel</button>';
 const select=dialog.querySelector('[data-scene]'),position=dialog.querySelector('[data-position]'),field=dialog.querySelector('textarea');let before;
 scenes.forEach((scene,i)=>{const option=document.createElement('option');option.value=i;option.textContent=scene.path;select.append(option);});select.value=Math.max(0,scenes.findIndex(s=>s.path===path));field.value=text;
 function positions(){const scene=scenes[Number(select.value)];before=scene.html;position.replaceChildren();const first=document.createElement('option');first.value=-1;first.textContent='Beginning of scene';position.append(first);[...inlineFragment(scene.html).children].forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+': '+p.textContent.slice(0,100);position.append(o);});position.value=String(Math.min(index,position.options.length-2));}
 select.onchange=()=>{index=0;positions();};positions();
 const close=()=>{dialog.close();dialog.remove();};dialog.querySelector('[data-close]').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
 for(const [selector,draft] of [['[data-normal]',false],['[data-draft]',true]])dialog.querySelector(selector).onclick=()=>{try{
  if(!field.value.trim())return;const scene=scenes[Number(select.value)];if(scene.html!==before)throw Error('Scene changed. Close and choose an insertion point again.');
  const root=document.createElement('div');root.append(inlineFragment(scene.html));const inserted=inlineFragment(draftTextHtml(field.value,draft));const at=Number(position.value);if(at<0)root.prepend(inserted);else root.children[at].after(inserted);
  storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));close();changed(scene);
 }catch(e){dialog.querySelector('[data-status]').textContent=e.message;}};
 document.body.append(dialog);dialog.showModal();
}
export function assimilateManuscriptDraft(book,scene,id){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 const root=document.createElement('div');root.append(inlineFragment(scene.html));if(!assimilateDraft(root,id))throw Error('This working draft is no longer present.');storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));
}
