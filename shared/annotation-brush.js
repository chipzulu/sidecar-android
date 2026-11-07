import {markerPairs} from './italic-markers.js';
const colors = {honey:'#d6ac39', sage:'#8bb378', rose:'#d38d93'};
export const noteFilename = id => 'Highlight ' + id + '.md';
export const isHighlightFile = name => /^Highlight [a-f0-9-]{36}\.md$/.test(name);
export function encodeNote({body, ...metadata}) {
  return '<!-- sidecar-highlight ' + JSON.stringify(metadata).replaceAll('<','\\u003c').replaceAll('>','\\u003e') + ' -->\n' + body;
}
export function decodeNote(text) {
  const match = /^<!-- sidecar-highlight (.+?) -->\r?\n/.exec(text);
  if (!match) return null;
  try {
    const n = JSON.parse(match[1]);
    if (!isHighlightFile(noteFilename(n.id)) || typeof n.path !== 'string' || !n.path.startsWith('Book/Chapters/') ||
        !Object.hasOwn(colors,n.color) || typeof n.quote !== 'string' || !n.quote ||
        !Number.isSafeInteger(n.start) || n.start < 0 || typeof n.before !== 'string' || typeof n.after !== 'string') return null;
    return {...n,body:text.slice(match[0].length)};
  } catch { return null; }
}
function fingerprint(text){
  let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return text.length+'-'+(hash>>>0);
}
export function locate(text,n) {
  if(n.fingerprint===fingerprint(text)&&text.slice(n.start,n.start+n.quote.length)===n.quote)return n.start;
  let pos=-1,best=-1,winner=-1;
  while ((pos=text.indexOf(n.quote,pos+1))!==-1) {
    let score=0;
    for(let i=1;i<=n.before.length && text[pos-i]===n.before.at(-i);i++)score++;
    for(let i=0;i<n.after.length && text[pos+n.quote.length+i]===n.after[i];i++)score++;
    if(score>best){winner=pos;best=score;}else if(score===best)winner=-1;
  }
  return winner;
}
// Build the same prose stream across page fragments; headings and page furniture are excluded.
function stream(roots) {
  let text='';const parts=[];
  for(const root of roots){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();){
      if(node.parentElement.closest('[data-sidecar-chrome],.keep-marker'))continue;
      parts.push({node,start:text.length,offset:0,length:node.length});text+=node.data;
    }
  }
  if(roots.some(root=>root.classList.contains('scene-editor'))){
    const hidden=new Set(markerPairs(text).flat());
    if(hidden.size){
      let plain='';const slices=[];
      for(const {node,start} of parts){
        let from=0;
        for(let i=0;i<=node.length;i++){
          if(i!==node.length&&!hidden.has(start+i))continue;
          if(i>from){slices.push({node,start:plain.length,offset:from,length:i-from});plain+=node.data.slice(from,i);}
          from=i+1;
        }
      }
      return {text:plain,parts:slices};
    }
  }
  return {text,parts};
}
export function selectionAnchor(path,roots,range) {
  const {text,parts}=stream(roots);
  const selected=parts.filter(({node})=>range.intersectsNode(node));
  if(!selected.length)return;
  const first=selected[0],last=selected.at(-1);
  const start=first.start+(first.node===range.startContainer?range.startOffset:0);
  const end=last.start+(last.node===range.endContainer?range.endOffset:last.node.length);
  const quote=text.slice(start,end);
  if(!quote.trim())return;
  return {path,start,end,quote,fingerprint:fingerprint(text),before:text.slice(Math.max(0,start-48),start),after:text.slice(end,end+48)};
}
export function mountBrush({viewport,rootsFor,onOpen,hover=false}){
  const layer=document.createElement('div');
  layer.className='annotation-paint';document.body.append(layer);
  let ranges=[],hits=[],frame=0,notes=[],hovered=null;
  const tip=document.createElement('aside');tip.className='annotation-tip';tip.hidden=true;document.body.append(tip);
  function paint(){
    frame=0;const area=viewport.getBoundingClientRect(),fragment=document.createDocumentFragment();
    hits=[];
    for(const {note,range} of ranges)for(const rect of range.getClientRects()){
      const left=Math.max(rect.left,area.left),right=Math.min(rect.right,area.right),top=Math.max(rect.top,area.top),bottom=Math.min(rect.bottom,area.bottom);
      if(right<=left||bottom<=top)continue;
      const mark=document.createElement('i');
      Object.assign(mark.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px',backgroundColor:colors[note.color]});
      fragment.append(mark);hits.push({note,left,right,top,bottom});
    }
    layer.replaceChildren(fragment);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  function rebuild(next=notes){
    notes=next;ranges=[];const streams=new Map();
    for(const note of notes){
      if(!streams.has(note.path))streams.set(note.path,stream(rootsFor(note.path)));
      const {text,parts}=streams.get(note.path),start=locate(text,note);
      if(start<0)continue;
      for(const part of parts){
        const left=Math.max(0,start-part.start),right=Math.min(part.length,start+note.quote.length-part.start);
        if(right<=left)continue;
        const range=document.createRange();range.setStart(part.node,part.offset+left);range.setEnd(part.node,part.offset+right);ranges.push({note,range});
      }
    }
    schedule();
  }
  function hit(e){return hits.find(h=>e.clientX>=h.left&&e.clientX<=h.right&&e.clientY>=h.top&&e.clientY<=h.bottom)?.note;}
  viewport.addEventListener('click',e=>{const note=hit(e);if(note&&getSelection().isCollapsed){tip.hidden=true;onOpen(note);}});
  if(hover)viewport.addEventListener('pointermove',e=>{
    hovered=hit(e);tip.hidden=!hovered;
    if(hovered){tip.textContent=hovered.body||hovered.quote;tip.style.left=Math.max(4,Math.min(e.clientX,innerWidth-280))+'px';tip.style.top=Math.max(4,Math.min(e.clientY+18,innerHeight-80))+'px';}
  });
  viewport.addEventListener('pointerleave',()=>tip.hidden=true);
  viewport.addEventListener('scroll',()=>{tip.hidden=true;schedule();},{passive:true});
  new ResizeObserver(schedule).observe(viewport);
  return {rebuild,schedule};
}
