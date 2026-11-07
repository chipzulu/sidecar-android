import {decodeNote,encodeNote,isHighlightFile,mountBrush,noteFilename,selectionAnchor} from './shared/annotation-brush.js';

export function mountHighlights({reader,viewport,status}){
  const $=id=>document.getElementById(id);
  const dialog=$('highlight-dialog'),body=$('highlight-body'),color=$('highlight-color');
  let book, rows={}, active=null, captured=null, reattach=null, sending=false;
  const tools=$('highlight-tools'), hint=$('highlight-hint');
  let firstWord=null;
  function stopPicking(){
    window.CSS?.highlights?.delete('pending-word');firstWord=null;captured=null;reattach=null;tools.hidden=true;
    $('highlight-toggle').textContent='Highlight';
    $('highlight-toggle').setAttribute('aria-pressed','false');
  }
  function startPicking(){
    firstWord=null;tools.hidden=false;
    $('highlight-toggle').textContent='Apply highlight';
    $('highlight-toggle').setAttribute('aria-pressed','true');
    hint.textContent='Tap the first word, then the last word.';
  }
  $('highlight-cancel').onclick=stopPicking;
  $('browse-highlights').onclick=()=>{stopPicking();list();};
  function roots(path){return [...reader.querySelectorAll('p[data-block]')].filter(p=>p.dataset.scene===path);}
  const brush=mountBrush({viewport,rootsFor:roots,onOpen:open,hover:true});
  function key(){return 'sidecar-highlights:'+JSON.stringify([book.repository.toLowerCase(),book.branch]);}
  function persist(next){
    localStorage.setItem(key(),JSON.stringify(next));
    rows=next;
    brush.rebuild(Object.values(rows).map(row=>row.note));
  }
  function load(snapshot){
    book=snapshot;stopPicking();active=null;rows=JSON.parse(localStorage.getItem(key())||'{}');
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
  $('reattach-highlight').onclick=()=>{reattach=active;dialog.close();getSelection().removeAllRanges();startPicking();};
  function capture(){
    const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed)return null;
    const range=sel.getRangeAt(0);
    const block=node=>(node.nodeType===1?node:node.parentElement)?.closest('p[data-block]');
    const from=block(range.startContainer),to=block(range.endContainer);
    if(!from||!to||!reader.contains(from)||from.dataset.scene!==to.dataset.scene)return null;
    return selectionAnchor(from.dataset.scene,roots(from.dataset.scene),range);
  }
  function apply(anchor){
    const note={...(reattach?rows[reattach].note:{id:crypto.randomUUID(),body:'',color:'honey'}),...anchor};
    try{save(note);stopPicking();getSelection().removeAllRanges();open(note);}
    catch(e){hint.textContent='Could not save highlight: '+e.message;status(e.message,true);}
  }
  $('highlight-toggle').onpointerdown=()=>{captured=capture();};
  $('highlight-toggle').onclick=()=>{
    const anchor=captured||capture();captured=null;
    if(anchor){apply(anchor);return;}
    startPicking();
  };
  // Two taps work with a finger or a pen without relying on Android selection handles.
  viewport.addEventListener('click',event=>{
    if(tools.hidden)return;
    const block=event.target.closest('p[data-block]');
    if(!block)return;
    event.stopImmediatePropagation();
    if(capture())return; // Native long-press or drag: let the reader adjust and press Apply.
    const caret=document.caretRangeFromPoint(event.clientX,event.clientY);
    const node=caret?.startContainer;
    if(node?.nodeType!==Node.TEXT_NODE||!block.contains(node))return;
    const text=node.data;
    let left=Math.min(caret.startOffset,text.length-1);
    if(/\s/.test(text[left])&&left>0)left--;
    if(left<0||/\s/.test(text[left]))return;
    let right=left+1;
    while(left>0&&!/\s/.test(text[left-1]))left--;
    while(right<text.length&&!/\s/.test(text[right]))right++;
    const word=document.createRange();word.setStart(node,left);word.setEnd(node,right);
    const path=block.dataset.scene;
    if(!firstWord||!firstWord.range.startContainer.isConnected||firstWord.path!==path){
      firstWord={path,range:word};hint.textContent='Now tap the last word. Tap the same word again for one word.';
      if(window.Highlight&&CSS.highlights)CSS.highlights.set('pending-word',new Highlight(word));
      return;
    }
    const earlier=word.compareBoundaryPoints(Range.START_TO_START,firstWord.range)<0;
    const start=earlier?word:firstWord.range,end=earlier?firstWord.range:word;
    const range=document.createRange();range.setStart(start.startContainer,start.startOffset);range.setEnd(end.endContainer,end.endOffset);
    const anchor=selectionAnchor(path,roots(path),range);
    if(anchor)apply(anchor);
  },true);
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
