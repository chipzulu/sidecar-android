import {allBlocks,updateBlock,assimilateBlock} from './draft-blocks.js';
import {storeAnnotatedScene} from './writing.js';
export function openBooxNotes(status){
 if(!window.SidecarNotes?.postMessage){status('Open BOOX Notes manually using Android split screen: Sidecar left, Notes right. Select the notebook named here.');return;}
 window.SidecarNotes.onmessage=event=>{try{status(JSON.parse(event.data).message);}catch{status('Could not read the BOOX Notes response.');}};
 status('Opening BOOX Notes…');window.SidecarNotes.postMessage('open');
}

export function draftDialog(book,scene,initial,onChange){
 let row=initial;
 const dialog=document.createElement('dialog');dialog.className='converted-draft-dialog';
 dialog.innerHTML='<h2>Converted text · not yet assimilated</h2><p>Inserted after the chosen paragraph. Open the named notebook in BOOX Notes, convert and copy its text, then paste here.</p><label>BOOX notebook name<input class="draft-notebook" type="text" maxlength="200"></label><button type="button" class="open-boox-notes">Open BOOX Notes</button><label>Converted text<textarea class="converted-text" rows="9"></textarea></label><p class="converted-status" role="status"></p><div class="draft-actions"><button type="button" class="paste-converted">Replace from clipboard</button><button type="button" class="save-converted">Save draft</button><button type="button" class="assimilate-converted">Assimilate</button><button type="button" class="remove-converted">Remove draft</button><button type="button" class="close-converted">Close</button></div>';
 document.body.append(dialog);
 const field=dialog.querySelector('textarea'),name=dialog.querySelector('input'),status=dialog.querySelector('[role=status]');
 field.value=row.text;name.value=row.notebook;
 const say=text=>status.textContent=text;
 const save=()=>{row=updateBlock(book,row,{text:field.value,notebook:name.value.trim()});say('Draft saved on this device. Send changes backs it up as a note; it is not manuscript prose until assimilated.');return row;};
 const attempt=fn=>()=>{try{fn();}catch(e){say(e.message);}};
 field.oninput=name.oninput=attempt(save);
 dialog.querySelector('.open-boox-notes').onclick=attempt(()=>{save();openBooxNotes(say);});
 dialog.querySelector('.paste-converted').onclick=async()=>{try{const text=await navigator.clipboard.readText();if(!text){say('Clipboard is empty.');return;}if(field.value&&!confirm('Replace this draft text with the clipboard?'))return;field.value=text;save();}catch{say('Clipboard access unavailable. Long-press inside Converted text and choose Paste.');field.focus();}};
 dialog.querySelector('.save-converted').onclick=attempt(save);
 dialog.querySelector('.assimilate-converted').onclick=attempt(()=>{save();if(!confirm('Insert this draft as ordinary manuscript paragraphs? It will no longer be a separate draft block.'))return;row=assimilateBlock(book,scene,row,storeAnnotatedScene);dialog.close();});
 dialog.querySelector('.remove-converted').onclick=attempt(()=>{if(!confirm('Remove this converted draft? The BOOX notebook is unchanged.'))return;row=updateBlock(book,row,{state:'removed'});dialog.close();});
 const close=attempt(()=>{const latest=allBlocks(book)[row.id];if(!latest?.transaction&&(!latest||latest.state==='pending'))save();dialog.close();});dialog.querySelector('.close-converted').onclick=close;
 dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=()=>{dialog.remove();onChange();};dialog.showModal();
}

