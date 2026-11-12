import {annotationGestures} from './annotation-gestures.js';
import {inkSvg} from './shared/annotation-ink.js';

import {inkPad} from './ink-pad.js';

import {attach,unwrap,inlineFragment,sceneNotes,annotatedHtml} from './inline-notes.js';

import {storeAnnotatedScene} from './writing.js';

import {decodeNote,encodeNote,isHighlightFile,noteFilename,selectionAnchor} from './shared/annotation-brush.js';



export function mountHighlights({reader,viewport,status,onWriting}){

  const $=id=>document.getElementById(id);

  const dialog=$('highlight-dialog'),body=$('highlight-body'),color=$('highlight-color');

  const inkPreview=document.createElement('div');inkPreview.className='annotation-preview';

  $('highlight-quote').after(inkPreview);

  let book, rows={}, active=null, captured=null, reattach=null, sending=false;

  const tools=$('highlight-tools'), hint=$('highlight-hint');

  let firstWord=null, pad=null, editingId=null, editStart=null;

  let annotationsVisible=localStorage.getItem('sidecar-annotations-visible')!=='false';

  const layer=$('annotations-layer');

  function setLayer(){

    reader.classList.toggle('annotations-hidden',!annotationsVisible);

    layer.setAttribute('aria-pressed',String(annotationsVisible));

    layer.textContent=annotationsVisible?'Annotations on':'Annotations off';

  }

  setLayer();

  layer.onclick=()=>{

    if(!closePad())return;

    annotationsVisible=!annotationsVisible;localStorage.setItem('sidecar-annotations-visible',String(annotationsVisible));

    stopPicking();tip.hidden=true;setLayer();repaint();

  };

  function closePad(){

    if(pad&&!pad.save())return false;

    pad?.dispose();pad=null;editingId=null;editStart=null;reader.querySelectorAll(".ink-note.editing").forEach(n=>n.classList.remove("editing"));return true;

  }

  function clearPanels(){

    for(const node of reader.querySelectorAll('.ink-note'))node.remove();

    for(const page of reader.querySelectorAll('.page-body[data-plain-height]')){

      page.style.height=page.dataset.plainHeight;page.style.minHeight='';

    }

  }

  function insert(note,box){

    const marks=[...reader.querySelectorAll('mark[data-annotation="'+note.id+'"]')];

    const mark=marks.at(-1),block=mark?.closest('p[data-block]');

    if(!block)return false;

    box.className='ink-note';box.dataset.sidecarChrome='annotation';box.dataset.note=note.id;

    block.after(box);

    const page=block.closest('.page-body');

    if(page){page.dataset.plainHeight ||= page.style.height;page.style.minHeight=page.dataset.plainHeight;page.style.height='auto';}

    return true;

  }

  function corner(note,box){
    const button=document.createElement('button');button.className='note-collapse';
    const collapsed=Boolean(rows[note.id]?.collapsed);
    button.textContent=collapsed?'▸':'▾';button.title=collapsed?'Expand note':'Collapse note';button.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded',String(!collapsed));
    button.onclick=e=>{e.stopPropagation();if(!closePad())return;persist({...rows,[note.id]:{...rows[note.id],collapsed:!collapsed}});repaint();};
    let hold=0,held=false;
    button.addEventListener('pointerdown',e=>{held=false;hold=setTimeout(()=>{held=true;showMenu(e.clientX,e.clientY,null,note.id);},800);});
    for(const type of ['pointerup','pointercancel','pointerleave'])button.addEventListener(type,()=>clearTimeout(hold));
    button.addEventListener('click',e=>{if(held){e.preventDefault();e.stopImmediatePropagation();held=false;}},true);
    box.append(button);
  }
  function repaint(){
    clearPanels();if(!annotationsVisible)return;
    for(const {note,discarded,collapsed} of Object.values(rows)){
      if(discarded||!note)continue;
      for(const mark of reader.querySelectorAll('mark[data-annotation="'+note.id+'"]'))mark.dataset.anchorKind=note.anchorKind||'highlight';
      if(note.noteDeleted||!note.ink)continue;
      const box=document.createElement('aside');if(!insert(note,box))continue;
      corner(note,box);
      if(collapsed){box.classList.add('collapsed');const label=document.createElement('span');label.textContent='Handwritten note';box.append(label);}
      else {box.append(inkSvg(note.ink));if(note.body){const text=document.createElement('div');text.textContent=note.body;box.append(text);}}
      box.tabIndex=0;box.setAttribute('aria-label','Handwritten note. Tap to edit.');
      box.onclick=()=>{if(collapsed){persist({...rows,[note.id]:{...rows[note.id],collapsed:false}});repaint();}else openWriting(rows[note.id].note);};
      box.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();box.click();}};
    }
  }
  function openWriting(note){
    if(!closePad())return;
    if(!note.ink){save({...note,noteDeleted:false,ink:{version:1,width:800,height:300,strokes:[]}});note=rows[note.id].note;}
    onWriting?.();annotationsVisible=true;setLayer();tip.hidden=true;
    if(rows[note.id]?.collapsed)persist({...rows,[note.id]:{...rows[note.id],collapsed:false}});
    repaint();reader.querySelector('.ink-note[data-note="'+note.id+'"]')?.remove();
    const box=document.createElement('aside');if(!insert(note,box)){open(note);return;}
    box.classList.add('editing');corner(note,box);editingId=note.id;editStart=structuredClone(note);
    const accept=document.createElement('button');accept.className='note-accept';accept.textContent='✓';accept.title='Accept edit';accept.setAttribute('aria-label','Accept edit');accept.onclick=e=>{e.stopPropagation();if(closePad())repaint();};box.append(accept);
    pad=inkPad(box,note.ink,(ink,finalize)=>{
      const old=rows[note.id];if(finalize){mergeInk();return;}
      const next={...old.note,ink,base:old.dirty?old.note.base:(old.base||old.main||old.remote||null)};
      persist({...rows,[note.id]:{...old,note:next,inline:true,dirty:true,needsInline:true}});
    },undefined,{quiet:true,onHold:()=>{if(!box.isConnected||editingId!==note.id)return;const r=box.getBoundingClientRect();showMenu(r.right-20,r.top+20,null,note.id);}});
    const bounds=box.getBoundingClientRect(),view=viewport.getBoundingClientRect();
    if(bounds.height>view.height||bounds.top<view.top)viewport.scrollTop+=bounds.top-view.top;
    else if(bounds.bottom>view.bottom)viewport.scrollTop+=bounds.bottom-view.bottom;
  }
  // Palm contacts on surrounding prose must not finish or switch the active note.
  for(const type of ['pointerdown','click','contextmenu'])reader.addEventListener(type,e=>{
    if(pad&&!e.target.closest('.ink-note.editing')){e.preventDefault();e.stopImmediatePropagation();}
  },true);

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

  let scenes=new Map();

  const tip=document.createElement('aside');tip.className='annotation-tip';tip.hidden=true;document.body.append(tip);

  reader.addEventListener('pointermove',event=>{

    const mark=event.target.closest('mark[data-annotation]'),note=rows[mark?.dataset.annotation]?.note;

    tip.hidden=!annotationsVisible||!note||event.pointerType==='touch'||!tools.hidden;

    if(!tip.hidden){

      tip.textContent=note.body||note.quote;

      tip.style.left=Math.max(4,Math.min(event.clientX,innerWidth-280))+'px';

      tip.style.top=Math.max(4,Math.min(event.clientY+18,innerHeight-80))+'px';

    }

  });

  reader.addEventListener('pointerleave',()=>tip.hidden=true);

  viewport.addEventListener('scroll',()=>tip.hidden=true,{passive:true});

  reader.addEventListener('click',event=>{

    const note=rows[event.target.closest('mark[data-annotation]')?.dataset.annotation]?.note;

    if(annotationsVisible&&note&&tools.hidden&&getSelection().isCollapsed){tip.hidden=true;openWriting(note);}

  });

  function key(){return 'sidecar-highlights:'+JSON.stringify([book.repository.toLowerCase(),book.branch]);}

  function persist(next){

    localStorage.setItem(key(),JSON.stringify(next));

    rows=next;



  }

  function mergeInk(){
    for(const [id,row] of Object.entries(rows)){
      if(!row.needsInline||row.discarded||!scenes.has(row.note.path))continue;
      writeInline(row.note,false);
      persist({...rows,[id]:{...row,needsInline:false}});
    }
  }
  function load(snapshot,model){

    scenes=new Map(model.chapters.flatMap(c=>c.scenes.map(s=>[s.path,s])));

    book=snapshot;stopPicking();lastCreated=null;active=null;rows=JSON.parse(localStorage.getItem(key())||'{}');

    const updates=new Map();

    for(const file of snapshot.files){

      if(!file.path.startsWith('Book/Notes/')||!isHighlightFile(file.path.slice(11)))continue;

      const note=decodeNote(new TextDecoder().decode(file.bytes));if(!note)continue;

      const prior=rows[note.id];

      if(prior?.discarded)continue;

      if(!prior||(!prior.dirty&&(prior.remote===file.sha||prior.main!==file.sha))){

        updates.set(note.id,note);

        rows[note.id]={...prior,note,dirty:false,remote:prior?.remote,main:file.sha,base:file.sha};

      }

    }

    mergeInk();
    for(const scene of scenes.values())sceneEdited(scene);

    for(const [id,incoming] of updates){

      const row=rows[id];

      if(row.inline && (incoming.color!==row.note.color||incoming.body!==row.note.body||JSON.stringify(incoming.ink)!==JSON.stringify(row.note.ink))){

        row.note={...row.note,color:incoming.color,body:incoming.body,ink:incoming.ink,noteDeleted:incoming.noteDeleted};

        writeInline(row.note,false);

      }

    }

    // Only old notes without an inline record need quotation-based migration.

    for(const row of Object.values(rows)){

      if(row.discarded)continue;

      const scene=scenes.get(row.note.path);

      if(scene&&!row.inline){writeInline(row.note,true,true);row.inline=true;}

      if(!scene)row.note.unattached=true;

    }

  }

  function sceneEdited(scene){

    for(const n of sceneNotes(scene.html)){

      const prior=rows[n.id]||{};

      rows[n.id]={...prior,inline:true,note:{...n,path:scene.path}};

    }

  }

  function writeInline(note,place,legacy=false){

    const scene=scenes.get(note.path);

    if(!scene)throw Error('Open the original scene or reattach this note to another passage.');

    const root=document.createElement('div');root.append(inlineFragment(scene.html));

    if(place){

      unwrap([root],note.id);

      const ok=attach([root],note,{raw:true,legacy});

      if(!ok&&!legacy)throw Error('The selection changed. Select the passage again.');

    }

    note.unattached=!root.querySelector('mark[data-annotation="'+note.id+'"]');

    const notes=sceneNotes(scene.html).filter(n=>n.id!==note.id);

    storeAnnotatedScene(book,scene,annotatedHtml(root,[...notes,note]));

  }

  function save(note,place=false){

    const old=rows[note.id]||{};

    const next={...note,base:old.dirty?old.note.base:(old.base||old.main||old.remote||null)};

    if(scenes.has(next.path)||place)writeInline(next,place);

    if(place){

      if(old.note && old.note.path!==next.path){

        const prior=scenes.get(old.note.path);

        if(prior){

          const root=document.createElement('div');root.append(inlineFragment(prior.html));unwrap([root],next.id);

          storeAnnotatedScene(book,prior,annotatedHtml(root,sceneNotes(prior.html).filter(n=>n.id!==next.id)));

        }

        unwrap(roots(old.note.path),next.id);

      }

      const blocks=roots(next.path);unwrap(blocks,next.id);attach(blocks,next);

    }

    for(const m of reader.querySelectorAll('mark[data-annotation="'+next.id+'"]')){m.dataset.color=next.color;m.dataset.anchorKind=next.anchorKind||'highlight';}

    persist({...rows,[note.id]:{...old,inline:true,note:next,dirty:true}});

  }

  function open(note){

    if(!closePad())return;

    $('discard-unattached').hidden=!note.unattached;

    inkPreview.replaceChildren();

    if(note.ink?.strokes.length)inkPreview.append(inkSvg(note.ink));

    $('handwrite-note').hidden=Boolean(note.unattached);

    active=note.id;$('highlight-quote').textContent=note.quote;body.value=note.body;color.value=note.color;

    $('highlight-list').hidden=true;$('highlight-fields').hidden=false;

    $('highlight-message').textContent='Saved on this tablet';

    if(!dialog.open)dialog.showModal();

  }

  $('handwrite-note').onclick=()=>{if(change()){dialog.close();openWriting(rows[active].note);}};

  function change(){

    try{save({...rows[active].note,body:body.value,color:color.value});repaint();$('highlight-message').textContent='Saved on this tablet';return true;}

    catch(e){$('highlight-message').textContent='Save failed. Copy the note before closing. '+e.message;return false;}

  }

  body.oninput=color.onchange=change;

  $('highlight-done').onclick=()=>{if(active&&(body.value!==rows[active].note.body||color.value!==rows[active].note.color)&&!change())return;dialog.close();};

  dialog.oncancel=e=>{e.preventDefault();$('highlight-done').click();};

  function list(){

    if(!closePad())return;

    active=null;$('highlight-fields').hidden=true;const box=$('highlight-list');box.hidden=false;box.replaceChildren();

    for(const {note} of Object.values(rows).filter(row=>!row.discarded&&!row.note?.noteDeleted)){const button=document.createElement('button');button.textContent=(note.unattached?'Unattached · ':'')+note.quote;button.onclick=()=>open(note);box.append(button);}

    $('highlight-message').textContent=box.childElementCount?'Choose a highlight':'Select words in one scene to highlight them.';

    dialog.showModal();

  }

  $('discard-unattached').onclick=()=>{

    const note=rows[active]?.note;

    if(!note?.unattached||!confirm('Discard this unattached note on this tablet?'))return;

    try{

      const scene=scenes.get(note.path);

      if(scene){

        const root=document.createElement('div');root.append(inlineFragment(scene.html));unwrap([root],active);

        storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html).filter(n=>n.id!==active)));

      }

      persist({...rows,[active]:{discarded:true}});

      active=null;dialog.close();

    }catch(e){$('highlight-message').textContent=e.message;}

  };

  $('reattach-highlight').onclick=()=>{reattach=active;dialog.close();getSelection().removeAllRanges();startPicking();};

  function capture(){

    const sel=getSelection();if(!sel.rangeCount||sel.isCollapsed)return null;

    const range=sel.getRangeAt(0);

    const block=node=>(node.nodeType===1?node:node.parentElement)?.closest('p[data-block]');

    const from=block(range.startContainer),to=block(range.endContainer);

    if(!from||!to||!reader.contains(from)||from.dataset.scene!==to.dataset.scene)return null;

    return selectionAnchor(from.dataset.scene,roots(from.dataset.scene),range);

  }

  function apply(anchor,write=true){

    const note={...(reattach?rows[reattach].note:{id:crypto.randomUUID(),body:'',color:'honey'}),...anchor};

    try{save(note,true);lastCreated=note.id;stopPicking();getSelection().removeAllRanges();if(write)openWriting(rows[note.id].note);else repaint();}

    catch(e){hint.textContent='Could not save highlight: '+e.message;status(e.message,true);}

  }

  const menu=document.createElement('dialog');menu.className='annotation-menu';document.body.append(menu);
  let lastCreated=null,menuPress=false;
  const gestures=annotationGestures(reader,{
    menu:showMenu,
    select:({path,range},write)=>{status('');const anchor=selectionAnchor(path,roots(path),range);if(anchor)apply(anchor,write);},
    cancel:()=>status('Reading mode')
  });
  function undoNote(id){
    if(id===editingId&&pad){pad.undo();return;}
    const n=rows[id]?.note;
    if(n?.ink?.strokes.length){save({...n,ink:{...n.ink,strokes:n.ink.strokes.slice(0,-1)}});repaint();return;}
    if(lastCreated){
      const row=rows[lastCreated],note=row?.note,scene=note&&scenes.get(note.path);if(!scene)return;
      const root=document.createElement('div');root.append(inlineFragment(scene.html));unwrap([root],note.id);
      storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html).filter(n=>n.id!==note.id)));
      unwrap(roots(note.path),note.id);persist({...rows,[note.id]:{...row,discarded:true,note:{...note,unattached:true}}});lastCreated=null;repaint();
    }
  }
  function showMenu(x,y,at=null,noteId=null){
    if(menu.open)menu.close();menuPress=false;menu.replaceChildren();
    const add=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>{menu.close();try{action();}catch(e){status(e.message,true);}};menu.append(b);};
    if(noteId){
      add('Pen',()=>{if(editingId!==noteId)openWriting(rows[noteId].note);pad?.setTool('pen');});
      add('Eraser',()=>{if(editingId!==noteId)openWriting(rows[noteId].note);pad?.setTool('eraser');});
      add('Undo',()=>undoNote(noteId));
      if(editingId===noteId)add('Cancel changes',()=>{
        const original=structuredClone(editStart);
        if(!closePad())return;
        save(original);repaint();
      });
      add('Delete note',()=>{
        if(!confirm('Delete the handwriting and typed note? The prose and any highlight will stay.'))return;
        if(!closePad())return;
        save({...rows[noteId].note,ink:undefined,body:'',noteDeleted:true});repaint();
      });
      add('More space',()=>{if(editingId!==noteId)openWriting(rows[noteId].note);pad?.more();});
      add('Edit typed note',()=>{if(closePad()){repaint();open(rows[noteId].note);}});
    }else if(at){
      add('Add note here',()=>{const anchor=selectionAnchor(at.path,roots(at.path),at.range);if(anchor)apply({...anchor,anchorKind:'point'});});
      add('Highlight and annotate',()=>{if(!closePad())return;stopPicking();gestures.setMode('note');status('Draw across the words to highlight and annotate. Tap without dragging to cancel.');});
      add('Highlight only',()=>{if(!closePad())return;stopPicking();gestures.setMode('highlight');status('Draw across the words to highlight. Tap without dragging to cancel.');});
      if(lastCreated)add('Undo',()=>undoNote(null));
    }
    if(!menu.childElementCount)return;
    menu.showModal();const r=menu.getBoundingClientRect();menu.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';menu.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px';
  }
  menu.addEventListener('pointerdown',()=>{menuPress=true;});
  menu.addEventListener('click',e=>{if(e.detail>0&&!menuPress){e.preventDefault();e.stopImmediatePropagation();}menuPress=false;},true);
  menu.onclick=e=>{if(e.target===menu)menu.close();};
  reader.addEventListener('contextmenu',e=>{
    const box=e.target.closest('.ink-note');if(!box)return;e.preventDefault();if(window.SidecarNativePen&&box.classList.contains('editing')&&e.target.closest('svg'))return;showMenu(e.clientX,e.clientY,null,box.dataset.note);
  });
  $('highlight-toggle').onpointerdown=()=>{captured=capture();};

  $('highlight-toggle').onclick=()=>{

    if(!closePad())return;

    annotationsVisible=true;setLayer();

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

  return {load,sceneEdited,beforeRender:()=>{gestures.setMode(null);if(menu.open)menu.close();return closePad();},repaint,async send(inbox){

    if(!closePad())throw Error('Save the handwriting before sending.');

    if(sending)return; sending=true;

    const owner=book;let count=0;

    try{for(const row of Object.values(rows).filter(r=>r.dirty&&!r.note.unattached)){

      const note=row.note,sha=await inbox.send(noteFilename(note.id),encodeNote(note),row.remote);

      if(owner!==book)throw Error('Book changed. Retry from the original book.');

      const latest=rows[note.id];

      persist({...rows,[note.id]:{...latest,remote:sha,base:sha,dirty:latest.note!==note}});

      count++;

    }return count;}finally{sending=false;}

  }};

}

