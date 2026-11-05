// Measured pagination. Split only DOM text ranges, preserving emphasis and bytes of text.
function textPoint(root,offset){const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,last;while(node=walk.nextNode()){last=node;if(offset<=node.length)return[node,offset];offset-=node.length;}return last?[last,last.length]:[root,0];}
function part(node,start,end){const result=node.cloneNode(false),range=document.createRange();if(start===0)range.setStart(node,0);else range.setStart(...textPoint(node,start));if(end===node.textContent.length)range.setEnd(node,node.childNodes.length);else range.setEnd(...textPoint(node,end));result.append(range.cloneContents());return result;}
export function paginate(source,host,{lines=28,title='',startPage=0}={}){
  host.replaceChildren();const lineHeight=parseFloat(getComputedStyle(host).lineHeight);const height=lineHeight*lines;
  let body,pageNumber=startPage;
  function next(){const page=document.createElement('article');page.className='reading-page';const header=document.createElement('div');header.className='page-heading';header.textContent=`${title} / ${++pageNumber}`;body=document.createElement('div');body.className='page-body scene';body.style.height=height+'px';page.append(header,body);host.append(page);}
  function fits(){return body.scrollHeight<=height+1;}
  const queue=[...source.children].map(n=>n.cloneNode(true));next();
  while(queue.length){let node=queue.shift();
    // Keep a heading with at least the beginning of what follows, when possible.
    if(node.matches('h1,h2,.chapter-subtitle,.scene-subtitle')&&body.children.length){body.append(node);const tooLow=node.getBoundingClientRect().bottom-body.getBoundingClientRect().top>height-lineHeight*2;node.remove();if(tooLow)next();}
    body.append(node);if(fits())continue;node.remove();
    if(node.matches('.keep-unit,.quote-unit')&&body.children.length){next();body.append(node);if(fits())continue;node.remove();}
    if(node.matches('.keep-unit,.quote-unit')){queue.unshift(...[...node.children].map(child=>{const copy=child.cloneNode(true);if(node.matches('.quote-unit'))copy.classList.add('quote-line');return copy;}));continue;}
    // Preserve short paragraphs whole where practical; split longer paragraphs at a word boundary.
    const length=node.textContent.length;
    if(!length||node.matches('h1,h2,.chapter-title,.chapter-subtitle,.scene-subtitle,.scene-break')){if(body.children.length)next();body.append(node);continue;}
    let low=0,high=length,best=0;
    while(low<=high){const middle=Math.floor((low+high)/2),probe=part(node,0,middle);body.append(probe);const okay=fits();probe.remove();if(okay){best=middle;low=middle+1;}else high=middle-1;}
    if(best===0){if(body.children.length){next();queue.unshift(node);continue;}best=1;}
    if(best<length){const text=node.textContent;let boundary=best;while(boundary>0&&!/\s/.test(text[boundary-1]))boundary--;if(boundary>0)best=boundary;}
    const first=part(node,0,best);body.append(first);
    if(best<length){const rest=part(node,best,length);rest.classList.add('continued');queue.unshift(rest);next();}
  }
  return pageNumber-startPage;
}
