const GAP=28;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function splitSize(size,share,min){
 const usable=Math.max(2,size-GAP),minimum=Math.min(min,usable/2);
 const first=clamp(usable*share,minimum,usable-minimum);
 return {first,second:usable-first,gap:GAP,usable,minimum};
}

// Layout remains independent of the writer ink lifecycle.
export function mountWriterWorkspace({container,preference,preferredPageWidth,canChange,beforeChange,onChange,canSwitch=()=>true,parkPen=()=>null,resumePen=()=>{}}){
 let active=false,pointer=null;
 const number=(key,fallback)=>{const n=Number(preference(key));return Number.isFinite(n)&&n>0&&n<1?n:fallback;};
 const state={side:preference('writer-side')==='left'?'left':'right',top:preference('writer-top')==='text'?'text':'ink',column:number('writer-column',.5),row:number('writer-row',.6)};
 const panel=document.createElement('section');panel.id='writer-workspace';panel.hidden=true;panel.setAttribute('aria-label','Handwriting workspace');
 panel.innerHTML='<div class="writer-frames"><section id="writer-ink" aria-labelledby="writer-ink-title"><div class="writer-ink-heading"><h2 id="writer-ink-title">Handwriting</h2><div id="writer-ink-tools" role="toolbar" aria-label="Writer handwriting tools"></div></div><div class="writer-ink-scroll"><div id="writer-ink-canvas"></div></div></section><div id="writer-row-edge" class="writer-edge horizontal" role="separator" aria-label="Resize handwriting and converted text" aria-orientation="horizontal" aria-controls="writer-ink writer-text" tabindex="0"></div><section id="writer-text" aria-label="Text conversion"><div id="writer-text-controls" role="toolbar" aria-label="Text editing"><button id="writer-accept" disabled>Accept</button><button id="writer-text-delete" title="Backspace" aria-label="Backspace">⌫</button><button id="writer-text-space" title="Space" aria-label="Space">␣</button><button id="writer-text-enter" title="New line" aria-label="Insert line break">↵</button><button id="writer-clear-text" disabled>Clear</button><button id="writer-draft-apply">Paste back</button><button id="writer-draft-cancel" hidden>Cancel editing</button></div><div class="writer-text-info"><span id="writer-edit-origin">New text</span><span id="writer-text-target"></span><span id="writer-conversion-status" role="status"></span></div><section id="writer-draft-edit"><div class="writer-text-surface"><div id="writer-text-mirror" aria-hidden="true"><div></div></div><textarea id="writer-draft-text" aria-label="Conversion text" inputmode="none" spellcheck="false"></textarea></div></section><div id="writer-accepted"></div><div id="writer-pending"></div></section></div>';
 const edge=document.createElement('div');edge.id='writer-column-edge';edge.className='writer-edge vertical';edge.hidden=true;edge.tabIndex=0;edge.setAttribute('role','separator');edge.setAttribute('aria-label','Resize manuscript and handwriting workspace');edge.setAttribute('aria-orientation','vertical');edge.setAttribute('aria-controls','manuscript-scroll writer-workspace');
 container.append(panel,edge);
 const strip=document.createElement('button');
 strip.id='writer-switch';strip.type='button';strip.hidden=true;container.append(strip);
 let narrow=false,showingManuscript=false,press=null,parked=null;
 function paintPane(){
  const reading=narrow&&(showingManuscript||press?.peek);
  container.classList.toggle('writer-single',narrow);
  container.classList.toggle('writer-show-manuscript',Boolean(reading));
  strip.hidden=!narrow;edge.hidden=!active||narrow;
  const arrow=(state.side==='left')===Boolean(reading)?'‹':'›';
  strip.textContent=arrow+' '+(reading?'Writer':'Manuscript');
  strip.setAttribute('aria-label',reading?'Show Writer':'Show manuscript; hold to peek');
  strip.title=strip.getAttribute('aria-label');
 }
 function showManuscript(value){
  if(!narrow||showingManuscript===value)return;
  if(value)parked=parkPen();
  showingManuscript=value;paintPane();
  if(!value&&parked){resumePen(parked);parked=null;}
 }
 function finishPress(commit=false){
  if(!press)return;
  const {timer,peek,id}=press;press=null;clearTimeout(timer);
  if(strip.hasPointerCapture(id))strip.releasePointerCapture(id);
  if(commit&&!peek&&canSwitch())showManuscript(!showingManuscript);
  paintPane();
 }
 strip.onpointerdown=e=>{
  if(e.button!==0||!e.isPrimary||press||!canSwitch()||
     e.pointerType==='touch'&&document.body.classList.contains('writer-pen-active'))return;
  e.preventDefault();strip.setPointerCapture(e.pointerId);
  press={id:e.pointerId,x:e.clientX,y:e.clientY,peek:false};
  if(!showingManuscript)press.timer=setTimeout(()=>{if(press&&canSwitch()){press.peek=true;paintPane();}},350);
 };
 strip.onpointermove=e=>{if(press?.id===e.pointerId&&!press.peek&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>14)finishPress();};
 strip.onpointerup=e=>{if(press?.id===e.pointerId){e.preventDefault();finishPress(true);}};
 strip.onpointercancel=strip.onlostpointercapture=e=>{if(press?.id===e.pointerId)finishPress();};
 strip.oncontextmenu=e=>e.preventDefault();
 strip.onclick=e=>{if(e.detail===0&&!e.pointerType&&canSwitch())showManuscript(!showingManuscript);};
 window.addEventListener('blur',()=>finishPress());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finishPress();});
 const $=id=>document.getElementById(id),frames=panel.querySelector('.writer-frames'),row=$('writer-row-edge');
 $('writer-side').value=state.side;$('writer-top').value=state.top;
 function remember(){for(const [key,value] of Object.entries(state))preference('writer-'+key,String(value));}
 function aria(node,size,label){node.setAttribute('aria-valuemin',String(Math.round(size.minimum/size.usable*100)));node.setAttribute('aria-valuemax',String(Math.round((size.usable-size.minimum)/size.usable*100)));node.setAttribute('aria-valuenow',String(Math.round(size.first/size.usable*100)));node.setAttribute('aria-valuetext',`${label}: ${Math.round(size.first/size.usable*100)} percent`);}
 function arrangeRows(){if(!active)return;const size=splitSize(frames.clientHeight,state.row,100),inkTop=state.top==='ink';
  const ink=$('writer-ink'),text=$('writer-text');ink.style.height=size.first+'px';text.style.height=size.second+'px';
  ink.style.top=(inkTop?0:size.second+GAP)+'px';text.style.top=(inkTop?size.first+GAP:0)+'px';row.style.top=(inkTop?size.first:size.second)+'px';
  aria(row,size,'Handwriting height');
 }
 function measure(){const available=container.clientWidth,inkLeft=state.side==='left';
  const manuscriptMin=preferredPageWidth()+32,writerMin=280;
  const compact=active&&available<manuscriptMin+GAP+writerMin;
  if(compact!==narrow){finishPress();if(!compact)showManuscript(false);narrow=compact;}
  paintPane();
  if(narrow){
   const rail=Math.max(44,Math.round(container.clientWidth*.05)),width=Math.max(1,container.clientWidth-rail),left=inkLeft?rail:0;
   strip.style.width=rail+'px';strip.style.left=(inkLeft?0:width)+'px';
   panel.style.width=width+'px';panel.style.left=left+'px';arrangeRows();
   // Keep Reader's full page area underneath the edge strip while peeking.
   const readingWidth=Math.min(available,Math.max(width,manuscriptMin));
   return {width:readingWidth,left:inkLeft?available-readingWidth:0};
  }
  const usable=available-GAP,first=clamp(usable*state.column,manuscriptMin,usable-writerMin);
  const size={first,second:usable-first,usable,minimum:writerMin};
  panel.style.width=size.second+'px';panel.style.left=(inkLeft?0:size.first+GAP)+'px';edge.style.left=(inkLeft?size.second:size.first)+'px';
  aria(edge,size,'Manuscript width');edge.setAttribute('aria-valuemin',String(Math.round(manuscriptMin/usable*100)));arrangeRows();
  return {width:size.first,left:inkLeft?size.second+GAP:0};
 }
 function change(fn){if(!canChange()||beforeChange()===false)return false;fn();remember();onChange();return true;}
 function setActive(value){return change(()=>{finishPress();parked=null;showingManuscript=false;narrow=false;active=value;panel.hidden=!active;paintPane();container.classList.toggle('writer-mode',active);});}
 $('writer-side').onchange=()=>{const value=$('writer-side').value;if(!change(()=>state.side=value))$('writer-side').value=state.side;};
 $('writer-top').onchange=()=>{const value=$('writer-top').value;if(!change(()=>state.top=value))$('writer-top').value=state.top;};
 function move(axis,position){const box=(axis==='column'?container:frames).getBoundingClientRect(),size=splitSize(axis==='column'?box.width:box.height,state[axis],axis==='column'?280:100);
  const from=position-(axis==='column'?box.left:box.top)-GAP/2;
  const normal=axis==='column'?state.side==='right':state.top==='ink';
  const minimum=axis==='column'?preferredPageWidth()+32:size.minimum;
  state[axis]=clamp(normal?from:size.usable-from,minimum,size.usable-size.minimum)/size.usable;
  measure();onChange();
 }
 for(const [handle,axis] of [[edge,'column'],[row,'row']]){
  handle.onpointerdown=e=>{if(e.button!==0||pointer||!canChange())return;e.preventDefault();if(beforeChange()===false)return;pointer={id:e.pointerId,handle,axis};handle.setPointerCapture(e.pointerId);container.classList.add('writer-resizing');};
  handle.onpointermove=e=>{if(pointer?.id!==e.pointerId||pointer.handle!==handle)return;e.preventDefault();move(axis,axis==='column'?e.clientX:e.clientY);};
  const end=()=>{if(pointer?.handle!==handle)return;pointer=null;container.classList.remove('writer-resizing');remember();onChange();};
  handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=end;
  handle.onkeydown=e=>{const keys=axis==='column'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];if(![...keys,'Home','End'].includes(e.key)||!canChange())return;e.preventDefault();if(beforeChange()===false)return;
   const box=handle.getBoundingClientRect(),bounds=(axis==='column'?container:frames).getBoundingClientRect();
   const current=axis==='column'?box.left+box.width/2:box.top+box.height/2;
   const start=axis==='column'?bounds.left:bounds.top,end=axis==='column'?bounds.right:bounds.bottom;
   move(axis,e.key==='Home'?start:e.key==='End'?end:current+(e.key===keys[0]?-16:16));remember();
  };
 }
 new ResizeObserver(arrangeRows).observe(frames);
 return {active:()=>active,measure,setActive,showManuscript};
}
