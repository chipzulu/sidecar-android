import {decodeNote,encodeNote,isHighlightFile,mountBrush,noteFilename,selectionAnchor} from './shared/annotation-brush.js';

export function mountHighlights({reader,viewport,status}){
  const $=id=>document.getElementById(id);
  const dialog=$('highlight-dialog'),body=$('highlight-body'),color=$('highlight-color');
  let book, rows={}, active=null, captured=null, reattach=null, sending=false;
  function roots(path){return [...reader.querySelectorAll('p[data-block]')].filter(p=>p.dataset.scene===path);}
  const brush=mountBrush({viewport,rootsFor:roots,onOpen:open,hover:true});
  function key(){return 'sidecar-highlights:'+JSON.stringify([book.repository.toLowerCase(),book.branch]);}
  function persist(next){
    localStorage.setItem(key(),JSON.stringify(next));
    rows=next;
    brush.rebuild(Object.values(rows).map(row=>row.note));
  }
  function load(snapshot){
    book=snapshot;active=captured=reattach=null;rows=JSON.parse(localStorage.getItem(key())||'{}');
    for(const file of snapshot.files){
      if(!file.path.startsWith('Book/Notes/')||!isHighlightFile(file.path.slice(11)))continue;
      const note=decodeNote(new TextDecoder().decode(file.bytes));if(!note)continue;
      const prior=rows[note.id];
      if(!prior||(!prior.dirty&&(prior.remote===file.sha||prior.main!==file.sha))){
        rows[note.id]={note,dirty:false,remote:prior?.remote,main:file.sha,base:file.sha};
      }
    }
    brush.rebuild(Object.values(rows).map(row=>row.note));
  }
  function save(note){
    const old=rows[note.id]||{};
    const next={...note,base:old.dirty?old.note.base:(old.base||old.main||old.remote||null)};
    persist({...rows,[note.id]:{...old,note:next,dirty:true}});
  }
  function open(note){
    active=note.id;$('highlight-quote').textContent=note.quote;body.value=note.body;color.value=note.color;
    $('highlight-list').hidden=true;$('highlight-fields').hidden=false;
    $('highlight-message').textContent='Saved on this tablet';
    if(!dialog.open)dialog.showModal();
  }
  function change(){
    try{save({...rows[active].note,body:body.value,color:color.value});$('highlight-message').textContent='Saved on this tablet';return true;}
    catch(e){$('highlight-message').textContent='Save failed. Copy the note before closing. '+e.message;return false;}
  }
  body.oninput=color.onchange=change;
  $('highlight-done').onclick=()=>{if(active&&(body.value!==rows[active].note.body||color.value!==rows[active].note.color)&&!change())return;dialog.close();};
  dialog.oncancel=e=>{e.preventDefault();$('highlight-done').click();};
  function list(){
    active=null;$('highlight-fields').hidden=true;const box=$('highlight-list');box.hidden=false;box.replaceChildren();
    for(const {note} of Object.values(rows)){const button=document.createElement('button');button.textContent=note.quote;button.onclick=()=>open(note);box.append(button);}
    $('highlight-message').textContent=box.childElementCount?'Choose a highlight':'Select words in one scene to highlight them.';
    dialog.showModal();
  }
  $('reattach-highlight').onclick=()=>{reattach=active;dialog.close();$('highlight-toggle').textContent='Reattach highlight';};
  function capture(){
    const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed)return null;
    const range=sel.getRangeAt(0);
    const block=node=>(node.nodeType===1?node:node.parentElement)?.closest('p[data-block]');
    const from=block(range.startContainer),to=block(range.endContainer);
    if(!from||!to||!reader.contains(from)||from.dataset.scene!==to.dataset.scene)return null;
    return selectionAnchor(from.dataset.scene,roots(from.dataset.scene),range);
  }
  $('highlight-toggle').onpointerdown=()=>{captured=capture();};
  $('highlight-toggle').onclick=()=>{
    const anchor=captured||capture();captured=null;
    if(!anchor){if(reattach){reattach=null;$('highlight-toggle').textContent='Highlight';}list();return;}
    const note={...(reattach?rows[reattach].note:{id:crypto.randomUUID(),body:'',color:'honey'}),...anchor};
    try{save(note);reattach=null;$('highlight-toggle').textContent='Highlight';getSelection().removeAllRanges();open(note);}
    catch(e){status(e.message,true);}
  };
  return {load,rebuild:()=>brush.rebuild(),async send(inbox){
    if(sending)return; sending=true;
    const owner=book;let count=0;
    try{for(const row of Object.values(rows).filter(r=>r.dirty)){
      const note=row.note,sha=await inbox.send(noteFilename(note.id),encodeNote(note),row.remote);
      if(owner!==book)throw Error('Book changed. Retry from the original book.');
      const latest=rows[note.id];
      persist({...rows,[note.id]:{...latest,remote:sha,base:sha,dirty:latest.note!==note}});
      count++;
    }return count;}finally{sending=false;}
  }};
}
