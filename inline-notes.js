import {validInk} from './shared/annotation-ink.js';
import {sceneFragmentFromHtml} from './shared/html-format.js';
import {markerPairs} from './shared/italic-markers.js';
import {keepMarker} from './shared/keep-together.js';
import {locate} from './shared/annotation-brush.js';

export function sceneNotes(html){
  if(!html.includes('data-sidecar-annotations'))return [];
  const tag=new DOMParser().parseFromString(html,'text/html').querySelector('template[data-sidecar-annotations]');
  if(!tag)return [];
  const notes=JSON.parse(tag.dataset.sidecarAnnotations);
  return notes.filter(n=>validInk(n.ink)&&/^[a-f0-9-]{36}$/.test(n.id)&&['sage','rose','honey'].includes(n.color)&&typeof n.body==='string'&&typeof n.quote==='string');
}
export function inlineFragment(html){return sceneFragmentFromHtml(html,document,true);}
export function annotatedHtml(root,notes){
  const holder=document.createElement('div');
  holder.append(inlineFragment(root.innerHTML));
  for(const mark of holder.querySelectorAll('mark'))if(!mark.textContent)mark.replaceWith(...mark.childNodes);
  if(notes.length){
    const record=document.createElement('template');
    record.dataset.sidecarAnnotations=JSON.stringify(notes.map(n=>({...n,unattached:!holder.querySelector('mark[data-annotation="'+n.id+'"]')})));
    holder.append(record);
  }
  return holder.innerHTML;
}
// Project raw prose to reading offsets once at attachment time. Keep markers
// and paired italic delimiters occupy no space in the paginated reading view.
function textMap(roots,raw){
  const nodes=[];let source='';
  for(const root of roots){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();){
      nodes.push({node,start:source.length});source+=node.data;
    }
  }
  const omit=new Set(raw?markerPairs(source).flat():[]);
  const parts=[];let text='';
  for(const {node,start} of nodes){
    if(raw&&keepMarker(node.parentElement.closest('p')?.textContent))continue;
    let from=0;
    for(let i=0;i<=node.length;i++){
      if(i!==node.length&&!omit.has(start+i))continue;
      if(i>from){parts.push({node,from,start:text.length,length:i-from});text+=node.data.slice(from,i);}
      from=i+1;
    }
  }
  return {parts,text};
}
export function unwrap(roots,id){
  for(const root of roots)for(const mark of root.querySelectorAll('mark[data-annotation="'+id+'"]'))mark.replaceWith(...mark.childNodes);
}
export function attach(roots,note,{raw=false,legacy=false}={}){
  const {parts,text}=textMap(roots,raw);
  const start=legacy?locate(text,note):note.start;
  if(start<0||text.slice(start,start+note.quote.length)!==note.quote)return false;
  for(const part of parts.reverse()){
    const a=Math.max(0,start-part.start),b=Math.min(part.length,start+note.quote.length-part.start);
    if(a>=b)continue;
    const range=document.createRange();range.setStart(part.node,part.from+a);range.setEnd(part.node,part.from+b);
    const mark=document.createElement('mark');mark.dataset.annotation=note.id;mark.dataset.color=note.color;mark.dataset.anchorKind=note.anchorKind||'highlight';range.surroundContents(mark);
  }
  return true;
}
export function colourMarks(root,notes){
  const colors=new Map(notes.map(n=>[n.id,n.color]));
  for(const mark of root.querySelectorAll('mark[data-annotation]')){mark.dataset.color=colors.get(mark.dataset.annotation)||'honey';mark.dataset.anchorKind=notes.find(n=>n.id===mark.dataset.annotation)?.anchorKind||'highlight';}
}
