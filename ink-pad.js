import {inkSvg,appendStroke,validInk} from './shared/annotation-ink.js';
import {browserInkInput} from './ink-input.js';

// Input adapters provide completed strokes. Persistence never runs during pointer movement.
export function inkPad(host, initial, save, inputFactory=browserInkInput) {
  let ink=structuredClone(initial||{version:1,width:800,height:300,strokes:[]});
  let count=ink.strokes.reduce((n,s)=>n+s.length,0),timer=0,pending=false,failed=false;
  const svg=inkSvg(ink),toolbar=document.createElement('div'),status=document.createElement('small');
  svg.setAttribute('aria-label','Write your annotation with a pen');toolbar.className='ink-actions';status.setAttribute('role','status');
  function message(text){if(status.textContent!==text)status.textContent=text;}
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
    // Validate only the incoming stroke; existing strokes were validated on entry.
    if(ink.strokes.length>=2000||count+points.length>24000||!validInk({...ink,strokes:[points]})){
      message('This note is full. Start another annotation.');return false;
    }
    if(!element)appendStroke(svg,points);
    ink={...ink,strokes:[...ink.strokes,points]};count+=points.length;
    checkpoint();return true;
  }
  const input=inputFactory(svg,{height:()=>ink.height,remaining:()=>ink.strokes.length>=2000?0:24000-count,begin:()=>clearTimeout(timer),complete});
  function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(!input.active())action();};toolbar.append(b);}
  button('Undo stroke',()=>{if(!ink.strokes.length)return;count-=ink.strokes.at(-1).length;ink={...ink,strokes:ink.strokes.slice(0,-1)};svg.lastElementChild?.remove();checkpoint();});
  button('More space',()=>{ink={...ink,height:Math.min(12000,ink.height+200)};svg.setAttribute('viewBox','0 0 800 '+ink.height);checkpoint();});
  button('Clear handwriting',()=>{if(!ink.strokes.length||!confirm('Clear the handwriting in this annotation?'))return;ink={version:1,width:800,height:300,strokes:[]};count=0;svg.replaceChildren();svg.setAttribute('viewBox','0 0 800 300');checkpoint();});
  function finish(){input.finish();return flush();}
  const hidden=()=>{if(document.hidden)finish();};
  window.addEventListener('pagehide',finish);document.addEventListener('visibilitychange',hidden);
  host.append(toolbar,svg,status);
  return {save:finish,dispose(){clearTimeout(timer);input.dispose();window.removeEventListener('pagehide',finish);document.removeEventListener('visibilitychange',hidden);}};
}
