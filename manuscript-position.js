import {textMap} from './inline-notes.js';
import {keepMarker} from './shared/keep-together.js';

// A caret belongs to a source paragraph, even when pagination splits it.
// Within that paragraph a soft break counts as one character. The solitary
// BR that HTML uses to display an empty paragraph counts as none.
function placeholder(p){
  return !p.textContent && p.querySelectorAll('br').length===1;
}
function units(p,slices){
  const result=[],empty=placeholder(p),walk=document.createTreeWalker(p,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  for(let node;node=walk.nextNode();){
    if(node.nodeType===Node.TEXT_NODE){
      if(slices)result.push(...(slices.get(node)||[]));
      else if(node.length)result.push({node,from:0,length:node.length});
    }else if(node.tagName==='BR'&&!empty)result.push({node,from:0,length:1});
  }
  return result;
}
function textOf(parts){
  return parts.map(p=>p.node.nodeType===Node.TEXT_NODE?p.node.data.slice(p.from,p.from+p.length):'\n').join('');
}
function pointAt(p,parts,offset,preferEnd){
  if(!parts.length && offset===0){
    const br=p.querySelector('br');
    return br?[br.parentNode,Array.prototype.indexOf.call(br.parentNode.childNodes,br)]:[p,0];
  }
  let pos=0;
  for(const part of parts){
    const next=pos+part.length;
    if(offset<next || offset===next&&(preferEnd||part===parts.at(-1))){
      if(part.node.nodeType===Node.TEXT_NODE)return [part.node,part.from+offset-pos];
      const parent=part.node.parentNode;
      return [parent,Array.prototype.indexOf.call(parent.childNodes,part.node)+(offset-pos)];
    }
    pos=next;
  }
  throw Error('The manuscript position has changed. Select the passage again.');
}
function fragments(roots,paragraph){return roots.filter(p=>Number(p.dataset.paragraph)===paragraph);}
export function readingPosition(roots,node,offset){
  const p=(node.nodeType===Node.TEXT_NODE?node.parentElement:node).closest('p[data-paragraph]');
  if(!p||!roots.includes(p))return null;
  const paragraph=Number(p.dataset.paragraph);
  let length=0;
  for(const part of fragments(roots,paragraph)){
    if(part===p)break;
    length+=textOf(units(part)).length;
  }
  const prefix=document.createRange();prefix.selectNodeContents(p);prefix.setEnd(node,offset);
  const contents=prefix.cloneContents();
  length+=contents.textContent.length+(placeholder(p)?0:contents.querySelectorAll('br').length);
  return {paragraph,offset:length,preferEnd:node.nodeType===Node.TEXT_NODE && offset===node.length};
}
export function readingCaret(roots,position){
  const paragraphs=fragments(roots,position.paragraph);let remaining=position.offset;
  for(const p of paragraphs){
    const parts=units(p),length=parts.reduce((sum,v)=>sum+v.length,0);
    if(remaining<length || remaining===length&&(position.preferEnd||p===paragraphs.at(-1))){
      const caret=document.createRange();caret.setStart(...pointAt(p,parts,remaining,position.preferEnd));caret.collapse(true);
      return caret;
    }
    remaining-=length;
  }
  return null;
}
function cleanPlaceholder(p){if(placeholder(p))p.querySelector('br').remove();}
function removeParagraph(p){
  const parent=p.parentElement;p.remove();
  if(parent.tagName==='BLOCKQUOTE'&&!parent.children.length)parent.remove();
}
function previousCharacter(text,offset){
  const before=text.slice(0,offset);
  if(typeof Intl.Segmenter==='function'){
    return new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(before).containing(offset-1).index;
  }
  return offset-Array.from(before).at(-1).length;
}
// Modify the sanitized source DOM. Published text, inline marks, emphasis,
// paragraph indentation and draft IDs all keep their normal representations.
export function replaceAtPositions(root,target,value,command){
  const paragraphs=[...root.querySelectorAll('p')],slices=new Map();
  for(const part of textMap([root],true).parts){
    if(!slices.has(part.node))slices.set(part.node,[]);
    slices.get(part.node).push(part);
  }
  let from={...target.from};
  const to=target.to, last=paragraphs[to.paragraph];
  let first=paragraphs[from.paragraph];
  if(!first||!last)throw Error('Select a position in this scene again.');
  const collapsed=from.paragraph===to.paragraph && from.offset===to.offset;
  if(command==='backspace' && collapsed){
    if(from.offset>0){
      from.offset=previousCharacter(textOf(units(first,slices)),from.offset);from.preferEnd=false;
    }else{
      const previous=paragraphs[from.paragraph-1];
      if(!previous || keepMarker(previous.textContent))return {position:from,changed:false};
      const gap=document.createRange();gap.setStartAfter(previous);gap.setEndBefore(first);
      if(gap.cloneContents().querySelector('hr'))return {position:from,changed:false};
      first=previous;
      from={paragraph:from.paragraph-1,offset:textOf(units(first,slices)).length,preferEnd:true};
    }
  }
  const range=document.createRange();
  range.setStart(...pointAt(first,units(first,slices),from.offset,from.preferEnd));
  range.setEnd(...pointAt(last,units(last,slices),to.offset,to.preferEnd));
  const styles=[];
  const startNode=range.startContainer;
  for(let el=startNode.nodeType===Node.TEXT_NODE?startNode.parentElement:startNode;el && el!==first;el=el.parentElement)styles.unshift(el);
  if(first===last)range.deleteContents();
  else{
    const tail=document.createRange();tail.selectNodeContents(last);tail.setEnd(range.endContainer,range.endOffset);tail.deleteContents();
    range.setEnd(first,first.childNodes.length);range.deleteContents();
    let structuralBreak=false;
    for(const p of paragraphs.slice(from.paragraph+1,to.paragraph)){
      if(keepMarker(p.textContent))structuralBreak=true;else removeParagraph(p);
    }
    const gap=document.createRange();gap.setStartAfter(first);gap.setEndBefore(last);
    if(!structuralBreak && !gap.cloneContents().querySelector('hr')){
      cleanPlaceholder(first);cleanPlaceholder(last);first.append(...last.childNodes);removeParagraph(last);
    }
  }
  // A live insertion range at the end of 'first' stays before any appended suffix.
  const lines=value.replace(/\r\n?/g,'\n').split('\n');
  let p=first;
  if(lines.length>1 || lines[0])cleanPlaceholder(first);
  if(lines[0]){
    const text=document.createTextNode(lines[0]);range.insertNode(text);range.setStartAfter(text);range.collapse(true);
  }
  if(lines.length>1){
    range.setEnd(first,first.childNodes.length);
    const suffix=range.extractContents();
    for(const line of lines.slice(1)){
      const next=first.cloneNode(false);
      let run=next;
      if(line || !suffix.textContent){
        for(const style of styles){const copy=style.cloneNode(false);run.append(copy);run=copy;}
        if(line)run.append(document.createTextNode(line));else if(styles.length)run.append(document.createElement('br'));
      }
      p.after(next);p=next;
    }
    p.append(suffix);
  }
  return {changed:!collapsed || !!value || command==='backspace',
    position:{paragraph:from.paragraph+lines.length-1,offset:(lines.length===1?from.offset:0)+lines.at(-1).length,preferEnd:true}};
}
