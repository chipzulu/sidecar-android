import {textMap,inlineFragment,annotatedHtml,sceneNotes} from './inline-notes.js';
import {storeAnnotatedScene} from './writing.js';
import {tabletTextAllowed} from './shared/book-workflow.js';
import {readingPosition,replaceAtPositions} from './manuscript-position.js';
export function selectedReadingText(roots,range){
 let text='',previous=null;
 for(const block of roots){
  if(!range.intersectsNode(block))continue;
  const piece=document.createRange();piece.selectNodeContents(block);
  if(block.contains(range.startContainer))piece.setStart(range.startContainer,range.startOffset);
  if(block.contains(range.endContainer))piece.setEnd(range.endContainer,range.endOffset);
  const fragment=piece.cloneContents();
  if(block.textContent || block.querySelectorAll('br').length!==1){
   for(const br of fragment.querySelectorAll('br'))br.replaceWith(document.createTextNode('\n'));
  }
  const original=block.dataset.paragraph??block.dataset.block??block;
  if(previous!==null && previous!==original)text+='\n';
  text+=fragment.textContent;previous=original;
 }
 return text;
}
export function captureManuscriptTarget(scene,roots,range,insertion=false){
 const map=textMap(roots,false);
 const offset=(container,at)=>{const probe=document.createRange();probe.setStart(container,at);probe.collapse(true);for(const p of map.parts){if(p.node===container)return p.start+at;if(probe.comparePoint(p.node,0)>=0)return p.start;if(probe.comparePoint(p.node,p.node.length)>=0)throw Error('Cannot locate this text position.');}return map.text.length;};
 const start=offset(range.startContainer,range.startOffset),end=insertion?start:offset(range.endContainer,range.endOffset);
 const root=document.createElement('div');root.append(inlineFragment(scene.html));const raw=textMap([root],true);
 if(raw.text!==map.text)throw Error('This view does not contain the complete scene text. Open the scene before editing this selection.');
 const selected=insertion?'':selectedReadingText(roots,range);
 const from=readingPosition(roots,range.startContainer,range.startOffset);
 const to=insertion?from:readingPosition(roots,range.endContainer,range.endOffset);
 return {id:crypto.randomUUID(),kind:'range',path:scene.path,before:scene.html,start,end,text:selected,originalText:selected,...(from&&to?{from,to}:{})};
}
export function pasteManuscriptTarget(book,scene,target,text,command){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 if(!scene||scene.html!==target.before||scene.path!==target.path)throw Error('The scene changed. Your text is kept; choose the destination again.');
 const root=document.createElement('div');root.append(inlineFragment(scene.html));
 if(target.from && target.to){
  if(!command && text===target.originalText)return target.to;
  const {position,changed}=replaceAtPositions(root,target,text,command);
  if(changed)storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));
  return position;
 }
 // Older saved Writer sessions only recorded character offsets.
 const {parts,text:source}=textMap([root],true);
 if(target.start<0||target.end<target.start||target.end>source.length)throw Error('The insertion location is no longer available.');
 if(target.start!==target.end&&text===target.originalText)return;
 const point=(offset,end=false)=>{const part=parts.find(p=>offset>=p.start&&(end?offset<=p.start+p.length:offset<p.start+p.length))||parts.at(-1);if(!part)throw Error('Choose a position in a paragraph.');return [part.node,part.from+Math.min(part.length,offset-part.start)];};
 const range=document.createRange();range.setStart(...point(target.start));if(target.start===target.end)range.collapse(true);else range.setEnd(...point(target.end,true));
 range.deleteContents();const fragment=document.createDocumentFragment();String(text).replace(/\r\n?/g,'\n').split('\n').forEach((line,i)=>{if(i)fragment.append(document.createElement('br'));fragment.append(document.createTextNode(line));});range.insertNode(fragment);
 storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));
}
