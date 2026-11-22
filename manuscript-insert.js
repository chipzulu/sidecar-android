import {draftTextHtml,assimilateDraft} from './shared/working-draft.js';
import {inlineFragment,annotatedHtml,sceneNotes} from './inline-notes.js';
import {storeAnnotatedScene} from './writing.js';
import {tabletTextAllowed} from './shared/book-workflow.js';
export function insertManuscriptDialog(book,scenes,{text='',path,index=0,working=true}={},changed){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 const dialog=document.createElement('dialog');dialog.className='working-draft-dialog';dialog.innerHTML='<h2>Insert manuscript text</h2><label>Scene <select data-scene></select></label><p><label>Insert after <select data-position></select></label></p><button data-paste type="button">Paste clipboard</button><textarea aria-label="Text to insert" placeholder="Paste or type text here"></textarea><p data-status role="status"></p><button data-normal>Insert normally</button><button data-draft>Insert as working draft</button><button data-close>Cancel</button>';
 const select=dialog.querySelector('[data-scene]'),position=dialog.querySelector('[data-position]'),field=dialog.querySelector('textarea');let before;
 scenes.forEach((scene,i)=>{const option=document.createElement('option');option.value=i;option.textContent=scene.path;select.append(option);});select.value=Math.max(0,scenes.findIndex(s=>s.path===path));field.value=text;
 function positions(){const scene=scenes[Number(select.value)];before=scene.html;position.replaceChildren();const first=document.createElement('option');first.value=-1;first.textContent='Beginning of scene';position.append(first);[...inlineFragment(scene.html).children].forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+': '+p.textContent.slice(0,100);position.append(o);});position.value=String(Math.min(index,position.options.length-2));}
 select.onchange=()=>{index=0;positions();};positions();
 let edits=0;field.addEventListener('input',()=>edits++);
 const paste=dialog.querySelector('[data-paste]'),message=dialog.querySelector('[data-status]');
 paste.onclick=async()=>{
  const revision=edits;paste.disabled=true;
  try{
   if(!navigator.clipboard?.readText)throw Error('Clipboard unavailable');
   const value=await navigator.clipboard.readText();
   if(!dialog.open)return;
   if(revision!==edits){message.textContent='Text changed while reading the clipboard. Press Paste clipboard again to insert it.';return;}
   if(!value){message.textContent='The clipboard contains no text.';return;}
   const start=field.selectionStart,end=field.selectionEnd;
   field.setRangeText(value,start,end,'end');edits++;field.focus();message.textContent='Clipboard text pasted. Review before inserting.';
  }catch{if(dialog.open)message.textContent='Clipboard access is unavailable. Press and hold inside the text box and choose Paste, or use your keyboard’s Paste command.';}
  finally{paste.disabled=false;}
 };
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

export function manuscriptDraft(scene,id){
 const root=document.createElement('div');root.append(inlineFragment(scene.html));
 const nodes=[...root.querySelectorAll('[data-working-draft]')].filter(n=>n.dataset.workingDraft===id);
 if(!nodes.length)throw Error('This working draft is no longer present.');
 let text='',last=null;for(const node of nodes){const block=node.closest('p');if(last&&last!==block)text+='\n';text+=(node.textContent===''&&node.children.length===1&&node.firstElementChild.tagName==='BR'?'':node.innerHTML).replace(/<br\s*\/?>(?:\n)?/gi,'\n').replace(/<[^>]*>/g,'');last=block;}
 // Decode text through DOM, preserving explicit line breaks.
 const decode=document.createElement('textarea');decode.innerHTML=text;
 return {id,path:scene.path,before:scene.html,text:decode.value};
}
export function updateManuscriptDraft(book,scene,edit,text=null){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 if(!scene||scene.html!==edit.before)throw Error('The scene changed. Your edited text is kept. Reopen the draft before applying.');
 const root=document.createElement('div');root.append(inlineFragment(scene.html));
 const nodes=[...root.querySelectorAll('[data-working-draft]')].filter(n=>n.dataset.workingDraft===edit.id);
 if(!nodes.length)throw Error('This working draft is no longer present.');
 if(text!==null&&!text.trim())throw Error('Use Delete in the draft menu to remove the block.');
 if(text!==null&&text===(edit.originalText??edit.text))return;
 const paragraphs=[...new Set(nodes.map(n=>n.closest('p')))];
 const wholeParagraphs=paragraphs.every(p=>p&&p.parentElement===root&&[...p.childNodes].every(n=>n.nodeType===3?!n.textContent.trim():n.matches?.('[data-working-draft]')&&n.dataset.workingDraft===edit.id));
 if(wholeParagraphs){
  if(text!==null){const fragment=inlineFragment(draftTextHtml(text,true));for(const span of fragment.querySelectorAll('[data-working-draft]'))span.dataset.workingDraft=edit.id;paragraphs[0].before(fragment);}
  for(const p of paragraphs)p.remove();
  storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));return;
 }
 const first=nodes[0];
 if(text!==null){const span=document.createElement('span');span.dataset.workingDraft=edit.id;text.replace(/\r\n?/g,'\n').split('\n').forEach((line,i)=>{if(i)span.append(document.createElement('br'));span.append(document.createTextNode(line));});first.before(span);}
 for(const node of nodes){const p=node.closest('p');node.remove();if(p&&!p.textContent.trim()&&!p.querySelector('[data-working-draft],mark,img'))p.remove();}
 storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));
}
