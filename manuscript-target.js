import {textMap,inlineFragment,annotatedHtml,sceneNotes} from './inline-notes.js';
import {storeAnnotatedScene} from './writing.js';
import {tabletTextAllowed} from './shared/book-workflow.js';
export function captureManuscriptTarget(scene,roots,range,insertion=false){
 const map=textMap(roots,false);
 const offset=(container,at)=>{const probe=document.createRange();probe.setStart(container,at);probe.collapse(true);for(const p of map.parts){if(p.node===container)return p.start+at;if(probe.comparePoint(p.node,0)>=0)return p.start;if(probe.comparePoint(p.node,p.node.length)>=0)throw Error('Cannot locate this text position.');}return map.text.length;};
 const start=offset(range.startContainer,range.startOffset),end=insertion?start:offset(range.endContainer,range.endOffset);
 const root=document.createElement('div');root.append(inlineFragment(scene.html));const raw=textMap([root],true);
 if(raw.text!==map.text)throw Error('This view does not contain the complete scene text. Open the scene before editing this selection.');
 let selected='',previous=null;
 if(!insertion)for(const block of roots){if(!range.intersectsNode(block))continue;const piece=document.createRange();piece.selectNodeContents(block);if(block.contains(range.startContainer))piece.setStart(range.startContainer,range.startOffset);if(block.contains(range.endContainer))piece.setEnd(range.endContainer,range.endOffset);const fragment=piece.cloneContents();for(const br of fragment.querySelectorAll('br'))br.replaceWith(document.createTextNode('\n'));if(previous&&previous.dataset.block!==block.dataset.block)selected+='\n';else if(previous&&!block.dataset.block)selected+='\n';selected+=fragment.textContent;previous=block;}
 return {id:crypto.randomUUID(),kind:'range',path:scene.path,before:scene.html,start,end,text:selected,originalText:selected};
}
export function pasteManuscriptTarget(book,scene,target,text){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 if(!scene||scene.html!==target.before)throw Error('The scene changed. Your text is kept; choose the destination again.');
 const root=document.createElement('div');root.append(inlineFragment(scene.html));const {parts,text:source}=textMap([root],true);
 if(target.start<0||target.end<target.start||target.end>source.length)throw Error('The insertion location is no longer available.');
 if(target.start!==target.end&&text===target.originalText)return;
 const point=(offset,end=false)=>{const part=parts.find(p=>offset>=p.start&&(end?offset<=p.start+p.length:offset<p.start+p.length))||parts.at(-1);if(!part)throw Error('Choose a position in a paragraph.');return [part.node,part.from+Math.min(part.length,offset-part.start)];};
 const range=document.createRange();range.setStart(...point(target.start));if(target.start===target.end)range.collapse(true);else range.setEnd(...point(target.end,true));
 range.deleteContents();const fragment=document.createDocumentFragment();String(text).replace(/\r\n?/g,'\n').split('\n').forEach((line,i)=>{if(i)fragment.append(document.createElement('br'));fragment.append(document.createTextNode(line));});range.insertNode(fragment);
 storeAnnotatedScene(book,scene,annotatedHtml(root,sceneNotes(scene.html)));
}
