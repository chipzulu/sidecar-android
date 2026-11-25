import {showRecognition} from './ink-recognition.js';
import {editOrigin} from './shared/peer-state.js';
import {resolveAnnotationConflict} from './annotation-conflict.js';
import {workKey} from './storage.js';
import {notePalette} from './note-palette.js';
import {positionWritingNote,finishWritingPosition,resetWritingPosition} from './writing-position.js';
import {annotationGestures,targetAtCaret} from './annotation-gestures.js';
import {inkSvg} from './shared/annotation-ink.js';

import {inkPad} from './ink-pad.js';

import {attach,unwrap,inlineFragment,sceneNotes,annotatedHtml} from './inline-notes.js';

import {storeAnnotatedScene} from './writing.js';
import {selectedReadingText} from './manuscript-target.js';

import {annotationTargets,hasAnnotationNote,touchesWorkingDraft,decodeNote,encodeNote,isHighlightFile,noteFilename,selectionAnchor} from './shared/annotation-brush.js';



export function mountHighlights({reader,viewport,status,onWriting,onEditScene,onKeyboardInput,onQuickEdit,onDraftAction,beforeMenu,canEditScene=()=>true}){

  const $=id=>document.getElementById(id);

  const dialog=$('highlight-dialog'),body=$('highlight-body'),color=$('highlight-color');

  const inkPreview=document.createElement('div');inkPreview.className='annotation-preview';

  $('highlight-quote').after(inkPreview);

  let book, rows={}, active=null, captured=null, reattach=null, sending=false;

  const tools=$('highlight-tools'), hint=$('highlight-hint');

  let firstWord=null, pad=null, palette=null, editingId=null, editStart=null;

  let annotationsVisible=localStorage.getItem('sidecar-annotations-visible')!=='false';

  const layer=$('annotations-layer');

  function setLayer(){

    reader.classList.toggle('annotations-hidden',!annotationsVisible);

    layer.checked=annotationsVisible;



  }

  setLayer();

  layer.onchange=()=>{

    if(!closePad()){setLayer();return;}

    annotationsVisible=layer.checked;localStorage.setItem('sidecar-annotations-visible',String(annotationsVisible));

    stopPicking();tip.hidden=true;setLayer();repaint();

  };

  function closePad(){

    if(pad&&!pad.save())return false;

    palette?.dispose();palette=null;pad?.dispose();finishWritingPosition(viewport);pad=null;editingId=null;editStart=null;reader.querySelectorAll(".ink-note.editing").forEach(n=>n.classList.remove("editing"));return true;

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
    if(onWriting?.()===false)return;
    if(!closePad())return;
    if(!note.ink){save({...note,noteDeleted:false,ink:{version:1,width:800,height:300,strokes:[]}});note=rows[note.id].note;}
    annotationsVisible=true;setLayer();tip.hidden=true;
    if(rows[note.id]?.collapsed)persist({...rows,[note.id]:{...rows[note.id],collapsed:false}});
    repaint();reader.querySelector('.ink-note[data-note="'+note.id+'"]')?.remove();
    const box=document.createElement('aside');if(!insert(note,box)){open(note);return;}
    box.classList.add('editing');corner(note,box);editingId=note.id;editStart=structuredClone(note);

    pad=inkPad(box,note.ink,(ink,finalize)=>{
      const old=rows[note.id];if(finalize){mergeInk();return;}
      const next={...old.note,ink,base:old.dirty?old.note.base:(old.base||old.remote||old.note?.base||old.main||null)};
      persist({...rows,[note.id]:{...old,note:next,inline:true,dirty:true,needsInline:true}});
    },undefined,{quiet:true,onHold:()=>{if(!box.isConnected||editingId!==note.id)return;const r=box.getBoundingClientRect();showMenu(r.right-20,r.top+20,null,note.id);}});
    positionWritingNote(box,viewport,reader);
    palette=notePalette({anchor:box,convert:()=>{
      const current=pad,ink=current?.snapshot();if(!ink)return;
      current.suspend();
      showRecognition(ink).finally(()=>{if(pad===current&&box.isConnected)current.resume();});
    },tool:()=>pad?.tool(),setTool:value=>pad?.setTool(value),undo:()=>pad?.undo(),moreSpace:()=>pad?.more(),accept:()=>{if(closePad())repaint();},more:(x,y)=>showMenu(x,y,null,note.id),onError:status});
  }
  // Palm contacts on surrounding prose must not finish or switch the active note.
  for(const type of ['pointerdown','click','contextmenu'])reader.addEventListener(type,e=>{
    if(pad&&!e.target.closest('.ink-note.editing')){e.preventDefault();e.stopImmediatePropagation();}
  },true);

  function stopPicking(){

    window.CSS?.highlights?.delete('pending-word');firstWord=null;captured=null;reattach=null;tools.hidden=true;





  }

  function startPicking(){

    firstWord=null;tools.hidden=false;





    hint.textContent='Tap the first word, then the last word.';

  }

  $('highlight-cancel').onclick=stopPicking;

  $('browse-highlights').onclick=()=>{stopPicking();list();};

  function roots(path){return [...reader.querySelectorAll('p[data-block]')].filter(p=>p.dataset.scene===path);}

  let scenes=new Map();

  const tip=document.createElement('aside');tip.className='annotation-tip';tip.hidden=true;document.body.append(tip);

  reader.addEventListener('pointermove',event=>{

    const {note}=annotationTargets(event.target,null,id=>rows[id]?.note);

    tip.hidden=!annotationsVisible||!note||event.pointerType==='touch'||!tools.hidden;

    if(!tip.hidden){

      tip.textContent=note.body||note.quote;

      tip.style.left=Math.max(4,Math.min(event.clientX,innerWidth-280))+'px';

      tip.style.top=Math.max(4,Math.min(event.clientY+18,innerHeight-80))+'px';

    }

  });

  reader.addEventListener('pointerleave',()=>tip.hidden=true);

  viewport.addEventListener('scroll',()=>tip.hidden=true,{passive:true});

  function key(){return workKey(book,'highlights');}

  function persist(next){
    for(const [id,row] of Object.entries(next)){
      if(row.note&&row.dirty&&!row.syncOrigin){const origin=rows[id]?.syncOrigin||editOrigin(book,row.note.path,null);const {bytes,contentBase64,...reference}=origin;next[id]={...row,syncOrigin:reference};}
    }


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

    book=snapshot;stopPicking();active=null;rows=JSON.parse(localStorage.getItem(key())||'{}');

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

    if(note.anchorKind==='point' && note.noteDeleted)unwrap([root],note.id);
    for(const mark of root.querySelectorAll('mark[data-annotation="'+note.id+'"]'))mark.dataset.anchorKind=note.anchorKind||'highlight';
    note.unattached=!root.querySelector('mark[data-annotation="'+note.id+'"]');

    const notes=sceneNotes(scene.html).filter(n=>n.id!==note.id);

    storeAnnotatedScene(book,scene,annotatedHtml(root,[...notes,note]));

  }

  function save(note,place=false){

    const old=rows[note.id]||{};

    const next={...note,base:old.dirty?old.note.base:(old.base||old.remote||old.note?.base||old.main||null)};

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

    if(next.anchorKind==='point' && next.noteDeleted)unwrap(roots(next.path),next.id);
    for(const m of reader.querySelectorAll('mark[data-annotation="'+next.id+'"]')){m.dataset.color=next.color;m.dataset.anchorKind=next.anchorKind||'highlight';}

    persist({...rows,[note.id]:{...old,inline:true,note:next,dirty:true}});

  }

  function open(note){

    if(!closePad())return;

    $('discard-unattached').hidden=!note.unattached || hasAnnotationNote(note);
    $('delete-annotation-note').hidden=!hasAnnotationNote(note);
    $('remove-annotation-highlight').hidden=note.unattached || note.anchorKind==='point';

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

    try{
      const note=rows[active].note;
      save({...note,body:body.value,color:color.value,noteDeleted:body.value.trim()?false:note.noteDeleted});
      $('delete-annotation-note').hidden=!hasAnnotationNote(rows[active].note);
      $('discard-unattached').hidden=!note.unattached || hasAnnotationNote(rows[active].note);
      repaint();$('highlight-message').textContent='Saved on this tablet';return true;
    }

    catch(e){$('highlight-message').textContent='Save failed. Copy the note before closing. '+e.message;return false;}

  }

  body.oninput=color.onchange=change;

  $('highlight-done').onclick=()=>{if(active&&(body.value!==rows[active].note.body||color.value!==rows[active].note.color)&&!change())return;dialog.close();};

  dialog.oncancel=e=>{e.preventDefault();$('highlight-done').click();};

  function list(){

    if(!closePad())return;

    active=null;$('highlight-fields').hidden=true;const box=$('highlight-list');box.hidden=false;box.replaceChildren();
    $('handwrite-note').hidden=true;

    for(const {note} of Object.values(rows).filter(row=>!row.discarded&&row.note&&(row.note.anchorKind!=='point'||hasAnnotationNote(row.note)))){const button=document.createElement('button');button.textContent=(note.unattached?'Unattached · ':'')+note.quote;button.onclick=()=>open(note);box.append(button);}

    $('highlight-message').textContent=box.childElementCount?'Choose a note or highlight.':'No saved annotations.';

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

    try{save(note,true);stopPicking();getSelection().removeAllRanges();if(write)openWriting(rows[note.id].note);else repaint();return rows[note.id].note;}

    catch(e){hint.textContent='Could not save highlight: '+e.message;status(e.message,true);}

  }

  const menu=document.createElement('dialog');menu.className='annotation-menu';document.body.append(menu);
  let menuPress=false,activeCaret=null;
  const gestures=annotationGestures(reader,{
    menu:(x,y,at)=>showMenu(x,y+28,at),
    enabled:()=>tools.hidden && !pad
  });
  function deleteNote(id){
    if(!hasAnnotationNote(rows[id]?.note) || !confirm('Delete this note? Its text and handwriting will be removed. The manuscript and highlight will stay.'))return false;
    if(!closePad())return false;
    const note=rows[id].note;
    save({...note,anchorKind:note.unattached?'point':note.anchorKind,ink:undefined,body:'',noteDeleted:true});repaint();return true;
  }
  function removeHighlight(id){
    const n=rows[id].note;
    save({...n,anchorKind:'point',noteDeleted:!hasAnnotationNote(n)});repaint();
  }
  $('delete-annotation-note').onclick=()=>{try{if(deleteNote(active))dialog.close();}catch(e){$('highlight-message').textContent=e.message;}};
  $('remove-annotation-highlight').onclick=()=>{try{removeHighlight(active);dialog.close();}catch(e){$('highlight-message').textContent=e.message;}};
  const caret=document.createElement('i');caret.className='manuscript-target-caret';caret.hidden=true;document.body.append(caret);
  function clearTarget(){activeCaret=null;caret.hidden=true;CSS.highlights?.delete('manuscript-target');}
  function paintCaret(){
    if(!activeCaret?.startContainer.isConnected){caret.hidden=true;return;}
    const node=activeCaret.startContainer;
    const p=(node.nodeType===Node.TEXT_NODE?node.parentElement:node).closest('p[data-block]');
    if(!p || !reader.contains(p)){caret.hidden=true;return;}
    let box=activeCaret.getBoundingClientRect(),left=box.left;
    if(!box.height){box=p.getBoundingClientRect();left=box.left+(parseFloat(getComputedStyle(p).textIndent)||0);}
    const view=viewport.getBoundingClientRect();
    caret.hidden=box.bottom<=view.top||box.top>=view.bottom;
    Object.assign(caret.style,{left:left+'px',top:box.top+'px',height:box.height+'px'});
  }
  menu.addEventListener('close',()=>{if(!menu.open)clearTarget();});
  viewport.addEventListener('scroll',()=>{if(activeCaret)paintCaret();},{passive:true});
  function showMenu(x,y,at=null,noteId=null){
    // Hand off pen ownership before making the manuscript modal. Otherwise
    // Writer's palm guard can block the very controls needed to dismiss it.
    if(beforeMenu?.()===false)return;
    if(menu.open)menu.close();menuPress=false;menu.replaceChildren();
    menu.setAttribute('aria-label',noteId?'Note actions':at?.selection?'Selected passage':'Manuscript caret');
    const add=(label,action,keep=false,icon=null)=>{
      const b=document.createElement('button');b.textContent=icon||label;b.type='button';
      if(icon){b.setAttribute('aria-label',label);b.title=label;}
      b.onclick=async()=>{if(!keep)menu.close();try{await action();palette?.refresh();}catch(e){status(e.message,true);}};
      menu.append(b);return b;
    };
    if(noteId){
      if(editingId===noteId)add('Cancel changes',()=>{
        const original=structuredClone(editStart);
        if(!closePad())return;
        save(original);repaint();
      });
      if(hasAnnotationNote(rows[noteId]?.note))add('Delete Note',()=>deleteNote(noteId));
    }else if(at){
      const chosen=at.selection;
      const element=at.caret?.startContainer;
      const draft=!chosen && (at.hit?.closest('[data-working-draft]')||(element?.nodeType===Node.TEXT_NODE?element.parentElement:element)?.closest('[data-working-draft]'));
      const hit=at.hit?.closest('mark[data-annotation]')||at.range.startContainer;
      const allowMark=!draft&&!touchesWorkingDraft(chosen||at.range);
      const {highlight,note}=annotationsVisible?annotationTargets(hit,chosen,id=>rows[id]?.note):{};
      if(canEditScene()){
        if(draft)add('Edit Draft',()=>onDraftAction(at.path,draft.dataset.workingDraft,'edit'));
        else add('Edit',()=>onEditScene(at));
        add('Keyboard Input',()=>onKeyboardInput(at));
        for(const [label,command,icon] of [['Space','space','␣'],['New line','newline','↵'],['Backspace','backspace','⌫']]){
          add(label,()=>{
            const pos=menu.getBoundingClientRect();
            const next=onQuickEdit(at,command);
            showMenu(pos.left,pos.top,next);
          },true,icon);
        }
      }
      if(note){
        add('Open Note',()=>note.ink?openWriting(note):open(note));
        add('Delete Note',()=>deleteNote(note.id));
      }else if(allowMark && (chosen || highlight || !at.range.collapsed))add('Add Note',()=>{
        if(highlight){openWriting(highlight);return;}
        const anchor=selectionAnchor(at.path,roots(at.path),chosen||at.range);
        if(anchor)apply({...anchor,anchorKind:chosen?'highlight':'point'});
      });
      if(chosen)add('Copy',()=>navigator.clipboard.writeText(selectedReadingText(roots(at.path),chosen))
        .then(()=>status('Selection copied.'),()=>status('Could not copy the selection.',true)));
      if(highlight)add('Remove Highlight',()=>removeHighlight(highlight.id));
      else if(allowMark&&(chosen||at.word))add('Highlight',()=>{
        const anchor=selectionAnchor(at.path,roots(at.path),chosen||at.word);
        if(anchor){annotationsVisible=true;layer.checked=true;setLayer();apply(anchor,false);}
      });
      if(draft && canEditScene()){
        add('Assimilate',()=>onDraftAction(at.path,draft.dataset.workingDraft,'assimilate'));
        add('Delete Draft',()=>onDraftAction(at.path,draft.dataset.workingDraft,'delete'));
      }
    }
    if(!menu.childElementCount)return;
    const handle=document.createElement('button');handle.type='button';handle.className='annotation-menu-drag';handle.textContent='⠿';handle.setAttribute('aria-label','Move manuscript menu');
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>{gestures.reset();menu.close();};
    menu.prepend(handle);menu.append(close);
    let drag=null;
    handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const r=menu.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.x,y:e.clientY-r.y};handle.setPointerCapture(e.pointerId);};
    handle.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();menu.style.left=Math.max(6,Math.min(e.clientX-drag.x,innerWidth-menu.offsetWidth-6))+'px';menu.style.top=Math.max(6,Math.min(e.clientY-drag.y,innerHeight-menu.offsetHeight-6))+'px';};
    handle.onpointerup=handle.onpointercancel=()=>{drag=null;};
    handle.onkeydown=e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(!delta)return;e.preventDefault();menu.style.left=Math.max(6,Math.min(menu.offsetLeft+delta[0],innerWidth-menu.offsetWidth-6))+'px';menu.style.top=Math.max(6,Math.min(menu.offsetTop+delta[1],innerHeight-menu.offsetHeight-6))+'px';};
    if(noteId)menu.showModal();else menu.show();const r=menu.getBoundingClientRect();menu.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';menu.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px';
    clearTarget();
    if(at?.selection && window.Highlight)CSS.highlights.set('manuscript-target',new Highlight(at.selection));
    else if(at?.caret){activeCaret=at.caret;paintCaret();}
  }
  document.addEventListener('pointerdown',e=>{
    if(!menu.open)return;
    const r=menu.getBoundingClientRect();
    if(!menu.contains(e.target)||e.target===menu&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))menu.close();
  },true);
  viewport.addEventListener('wheel',()=>{if(menu.open)menu.close();},{passive:true});
  function selectionMenu(range){
    const start=range.cloneRange(),end=range.cloneRange();start.collapse(true);end.collapse(false);
    const at=targetAtCaret(start),other=targetAtCaret(end);
    if(!at||at.path!==other?.path||pad||!tools.hidden)return;
    const rect=end.getBoundingClientRect();getSelection().removeAllRanges();
    showMenu(rect.left,rect.bottom+6,{...at,selection:range});
  }
  menu.addEventListener('pointerdown',()=>{menuPress=true;});
  menu.addEventListener('click',e=>{if(e.detail>0&&!menuPress){e.preventDefault();e.stopImmediatePropagation();}menuPress=false;},true);
  menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();gestures.reset();menu.close();}});
  reader.addEventListener('contextmenu',e=>{
    if(e.target.closest('.note-collapse')){e.preventDefault();return;}const box=e.target.closest('.ink-note');if(!box)return;e.preventDefault();if(window.SidecarNativePen&&box.classList.contains('editing')&&e.target.closest('svg'))return;showMenu(e.clientX,e.clientY,null,box.dataset.note);
  });
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

  return {load,sceneEdited,selectionMenu,prepareSend(){if(!closePad())throw Error('Finish the current pen stroke before sending.');mergeInk();},beforeRender:()=>{gestures.reset();if(menu.open)menu.close();if(!closePad())return false;resetWritingPosition(viewport);return true;},repaint,async send(inbox){

    if(!closePad())throw Error('Save the handwriting before sending.');

    if(sending)return; sending=true;

    const owner=book;let count=0;

    try{for(const row of Object.values(rows).filter(r=>r.dirty&&!r.note.unattached)){

      const note=row.note;let sha;
      try{sha=await inbox.send(noteFilename(note.id),encodeNote(note),row.remote||row.note.base||row.base);}
      catch(error){
        if(error.code!=='ANNOTATION_CONFLICT'||!error.remote)throw error;
        const choice=await resolveAnnotationConflict(note,error.remote.note);
        if(owner!==book)throw Error('Book changed. Retry from the original book.');
        if(choice==='cancel')throw Error('Send cancelled. Tablet and GitHub copies are unchanged for this annotation.');
        // Preserve both candidates locally before the explicitly selected replacement.
        localStorage.setItem(workKey(book,'annotation-recovery',note.id+':'+crypto.randomUUID()),JSON.stringify({tablet:note,remote:error.remote.note,remoteSha:error.remote.sha,date:new Date().toISOString()}));
        if(choice==='remote'){
          const accepted=structuredClone(error.remote.note);writeInline(accepted,true);
          persist({...rows,[note.id]:{...rows[note.id],note:accepted,remote:error.remote.sha,base:error.remote.sha,dirty:false,needsInline:false}});repaint();continue;
        }
        // Compare-and-swap against the version just previewed; never force overwrite.
        sha=await inbox.send(noteFilename(note.id),encodeNote(note),error.remote.sha);
      }

      if(owner!==book)throw Error('Book changed. Retry from the original book.');

      const latest=rows[note.id];

      persist({...rows,[note.id]:{...latest,remote:sha,base:sha,dirty:latest.note!==note}});

      count++;

    }return count;}finally{sending=false;}

  }};

}

