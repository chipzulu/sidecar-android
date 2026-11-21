const GAP=28;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function splitSize(size,share,min){
 const usable=Math.max(2,size-GAP),minimum=Math.min(min,usable/2);
 const first=clamp(usable*share,minimum,usable-minimum);
 return {first,second:usable-first,gap:GAP,usable,minimum};
}

// Layout remains independent of the writer ink lifecycle.
export function mountWriterWorkspace({container,preference,canChange,beforeChange,onChange}){
 let active=false,pointer=null;
 const number=(key,fallback)=>{const n=Number(preference(key));return Number.isFinite(n)&&n>0&&n<1?n:fallback;};
 const state={side:preference('writer-side')==='left'?'left':'right',top:preference('writer-top')==='text'?'text':'ink',column:number('writer-column',.5),row:number('writer-row',.6)};
 const panel=document.createElement('section');panel.id='writer-workspace';panel.hidden=true;panel.setAttribute('aria-label','Handwriting workspace');
 panel.innerHTML='<div class="writer-frames"><section id="writer-ink" aria-labelledby="writer-ink-title"><div class="writer-ink-heading"><h2 id="writer-ink-title">Handwriting</h2><div id="writer-ink-tools" role="toolbar" aria-label="Writer handwriting tools"></div></div><div class="writer-ink-scroll"><div id="writer-ink-canvas"></div></div></section><div id="writer-row-edge" class="writer-edge horizontal" role="separator" aria-label="Resize handwriting and converted text" aria-orientation="horizontal" aria-controls="writer-ink writer-text" tabindex="0"></div><section id="writer-text" aria-labelledby="writer-text-title"><h2 id="writer-text-title">Converted text</h2><div id="writer-text-controls"><button id="writer-accept" disabled>Accept</button><button id="writer-copy" disabled>Copy accepted text</button><button id="writer-insert" disabled>Insert accepted text…</button><button id="writer-clear-text" disabled>Clear text…</button></div><p id="writer-conversion-status" role="status"></p><div id="writer-accepted"></div><div id="writer-pending"></div><p class="writer-local-hint">Your writing draft saves on this device. It is not sent to GitHub yet.</p></section></div>';
 const edge=document.createElement('div');edge.id='writer-column-edge';edge.className='writer-edge vertical';edge.hidden=true;edge.tabIndex=0;edge.setAttribute('role','separator');edge.setAttribute('aria-label','Resize manuscript and handwriting workspace');edge.setAttribute('aria-orientation','vertical');edge.setAttribute('aria-controls','manuscript-scroll writer-workspace');
 container.append(panel,edge);
 const $=id=>document.getElementById(id),frames=panel.querySelector('.writer-frames'),row=$('writer-row-edge');
 $('writer-side').value=state.side;$('writer-top').value=state.top;
 function remember(){for(const [key,value] of Object.entries(state))preference('writer-'+key,String(value));}
 function aria(node,size,label){node.setAttribute('aria-valuemin',String(Math.round(size.minimum/size.usable*100)));node.setAttribute('aria-valuemax',String(Math.round((size.usable-size.minimum)/size.usable*100)));node.setAttribute('aria-valuenow',String(Math.round(size.first/size.usable*100)));node.setAttribute('aria-valuetext',`${label}: ${Math.round(size.first/size.usable*100)} percent`);}
 function arrangeRows(){if(!active)return;const size=splitSize(frames.clientHeight,state.row,100),inkTop=state.top==='ink';
  const ink=$('writer-ink'),text=$('writer-text');ink.style.height=size.first+'px';text.style.height=size.second+'px';
  ink.style.top=(inkTop?0:size.second+GAP)+'px';text.style.top=(inkTop?size.first+GAP:0)+'px';row.style.top=(inkTop?size.first:size.second)+'px';
  aria(row,size,'Handwriting height');
 }
 function measure(){const size=splitSize(container.clientWidth,state.column,280),inkLeft=state.side==='left';
  panel.style.width=size.second+'px';panel.style.left=(inkLeft?0:size.first+GAP)+'px';edge.style.left=(inkLeft?size.second:size.first)+'px';
  aria(edge,size,'Manuscript width');arrangeRows();
  return {width:size.first,left:inkLeft?size.second+GAP:0};
 }
 function change(fn){if(!canChange()||beforeChange()===false)return false;fn();remember();onChange();return true;}
 function setActive(value){return change(()=>{active=value;panel.hidden=edge.hidden=!active;container.classList.toggle('writer-mode',active);});}
 $('writer-side').onchange=()=>{const value=$('writer-side').value;if(!change(()=>state.side=value))$('writer-side').value=state.side;};
 $('writer-top').onchange=()=>{const value=$('writer-top').value;if(!change(()=>state.top=value))$('writer-top').value=state.top;};
 function move(axis,position){const box=(axis==='column'?container:frames).getBoundingClientRect(),size=splitSize(axis==='column'?box.width:box.height,state[axis],axis==='column'?280:100);
  const from=position-(axis==='column'?box.left:box.top)-GAP/2;
  const normal=axis==='column'?state.side==='right':state.top==='ink';
  state[axis]=clamp(normal?from:size.usable-from,size.minimum,size.usable-size.minimum)/size.usable;
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
 return {active:()=>active,measure,setActive};
}
