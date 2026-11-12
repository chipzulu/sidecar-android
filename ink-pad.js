import {inkSvg,appendStroke,validInk} from './shared/annotation-ink.js';
import {adaptiveInkInput} from './ink-native.js';
import {eraserInput,strokeTouchesSweep,eraserSweep,prepareStroke} from './ink-eraser.js';

// Input adapters provide completed strokes. Persistence never runs during pointer movement.
export function inkPad(host, initial, save, inputFactory=adaptiveInkInput, {quiet=false,onHold}={}) {
  let ink=structuredClone(initial||{version:1,width:800,height:300,strokes:[]});
  let count=ink.strokes.reduce((n,s)=>n+s.length,0),timer=0,pending=false,failed=false,started=0,nativeStroke=false;
  let input,mode='pen',eraseStart=null,eraseLines=[];const history=[];
  function remember(){history.push(ink);if(history.length>50)history.shift();}
  const svg=inkSvg(ink),toolbar=document.createElement('div'),status=document.createElement('small');
  svg.setAttribute('aria-label','Write your annotation with a pen');toolbar.className='ink-actions';toolbar.hidden=quiet;status.setAttribute('role','status');
  function message(text){if(mode==='eraser'&&!text.startsWith('Eraser'))text='Eraser · '+text;if(status.textContent!==text)status.textContent=text;}
  function flush(){
    clearTimeout(timer);
    try{if(failed){save(ink,false);failed=false;}if(pending){save(ink,true);pending=false;}message('Saved on this device');return true;}
    catch(e){message('Could not save handwriting: '+e.message);return false;}
  }
  function checkpoint(){
    pending=true;
    try{save(ink,false);failed=false;message('Saved on this device');}
    catch(e){failed=true;message('Could not save handwriting: '+e.message);}
    clearTimeout(timer);timer=setTimeout(flush,800);
  }
  function complete(points,element){
    if(onHold&&!nativeStroke&&performance.now()-started>=600&&points.length&&points.every(p=>Math.hypot(p[0]-points[0][0],p[1]-points[0][1])<12)){
      // Browser-only stationary hold; native strokes always remain ink.
      element?.remove();setTimeout(()=>onHold(),0);return true;
    }
    // Validate only the incoming stroke; existing strokes were validated on entry.
    if(ink.strokes.length>=2000||count+points.length>24000||!validInk({...ink,strokes:[points]})){
      message('This note is full. Start another annotation.');return false;
    }
    remember();
    if(!element)appendStroke(svg,points);
    ink={...ink,strokes:[...ink.strokes,points]};count+=points.length;
    checkpoint();return true;
  }
  host.append(toolbar,svg,status);
  function redraw(){
    svg.querySelectorAll('polyline').forEach(n=>n.remove());
    for(const stroke of ink.strokes)appendStroke(svg,stroke);
    // Keep the eraser cursor above permanent ink.
    const cursor=svg.querySelector('polygon');if(cursor)svg.append(cursor);
    svg.setAttribute('viewBox','0 0 800 '+ink.height);count=ink.strokes.reduce((n,s)=>n+s.length,0);
  }
  function setTool(next){
    if(input?.active()||!['pen','eraser'].includes(next))return false;
    if(input&&next===mode)return true;
    input?.dispose();mode=next;host.dataset.inkTool=mode;
    if(mode==='pen')input=inputFactory(svg,{height:()=>ink.height,remaining:()=>ink.strokes.length>=2000?0:24000-count,begin:(source)=>{nativeStroke=source?.native===true;started=performance.now();clearTimeout(timer);},complete});
    else {ink.strokes.forEach(prepareStroke);input=eraserInput(svg,{
      begin(){eraseStart=null;eraseLines=[...svg.querySelectorAll('polyline')];clearTimeout(timer);},
      sweep(a,b,r){
        const area=eraserSweep(a,b,r),keptLines=[];
        const remaining=ink.strokes.filter((s,i)=>{if(!strokeTouchesSweep(s,area)){keptLines.push(eraseLines[i]);return true;}eraseLines[i]?.remove();return false;});
        eraseLines=keptLines;
        if(remaining.length===ink.strokes.length)return;
        if(!eraseStart){eraseStart=ink;remember();}
        ink={...ink,strokes:remaining};count=remaining.reduce((n,s)=>n+s.length,0);
      },
      end(){if(eraseStart){eraseStart=null;checkpoint();}}
    });}
    message(mode==='eraser'?'Eraser · whole strokes · choose Pen in the note menu to write':'Pen');return true;
  }
  setTool('pen');
  const actions={};
  function button(label,action){actions[label]=()=>{if(!input.active())action();};const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(!input.active())action();};toolbar.append(b);}
  button('Undo stroke',()=>{if(history.length)ink=history.pop();else if(ink.strokes.length)ink={...ink,strokes:ink.strokes.slice(0,-1)};else return;redraw();checkpoint();});
  button('More space',()=>{remember();ink={...ink,height:Math.min(12000,ink.height+200)};svg.setAttribute('viewBox','0 0 800 '+ink.height);checkpoint();});
  button('Clear handwriting',()=>{if(!ink.strokes.length||!confirm('Clear the handwriting in this annotation?'))return;remember();ink={version:1,width:800,height:300,strokes:[]};redraw();checkpoint();});
  function finish(){if(input.finish()===false){message("Finish the pen stroke before closing this note.");return false;}return flush();}
  const hidden=()=>{if(document.hidden)finish();};
  window.addEventListener('pagehide',finish);document.addEventListener('visibilitychange',hidden);
  return {save:finish,tool:()=>mode,setTool,undo:()=>actions['Undo stroke'](),more:()=>actions['More space'](),clear:()=>actions['Clear handwriting'](),dispose(){clearTimeout(timer);input.dispose();window.removeEventListener('pagehide',finish);document.removeEventListener('visibilitychange',hidden);}};
}
