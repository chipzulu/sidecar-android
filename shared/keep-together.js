export function keepMarker(text) {
  const value = String(text || '').trim();
  return value === '¤keep' ? 'start' : value === '¤endkeep' ? 'end' : '';
}

export function keepGroups(texts) {
  const groups = [], errors = [];
  let start = -1, nested = false;
  texts.forEach((text, index) => {
    const marker = keepMarker(text);
    if (marker === 'start') {
      if (start >= 0) { nested = true; errors.push(index); }
      else start = index;
    } else if (marker === 'end') {
      if (start < 0) errors.push(index);
      else {
        if (!nested) groups.push({start,end:index});
        else errors.push(start,index);
        start = -1; nested = false;
      }
    }
  });
  if (start >= 0) errors.push(start);
  return {groups,errors};
}

export function keepParagraphs(root) {
  return [...root.querySelectorAll('p,div')].filter(p =>
    !p.closest('[data-sidecar-chrome]') && !p.querySelector('p,div'));
}

export function decorateKeepGroups(root) {
  const paragraphs = keepParagraphs(root);
  for (const p of paragraphs) {
    delete p.dataset.keepGroup;
    p.classList.remove('keep-marker','keep-member','keep-invalid');
    if (keepMarker(p.textContent)) p.classList.add('keep-marker');
  }
  const plan = keepGroups(paragraphs.map(p=>p.textContent));
  plan.groups.forEach(({start,end},index) => {
    for(let i=start;i<=end;i++) {
      paragraphs[i].dataset.keepGroup=String(index+1);
      paragraphs[i].classList.add('keep-member');
    }
  });
  for(const i of plan.errors) paragraphs[i].classList.add('keep-invalid');
  return {paragraphs,...plan};
}

export function exportKeepBlocks(blocks) {
  const text = block => (block.runs || []).map(r=>r.break?'\n':r.text || '').join('');
  const plan=keepGroups(blocks.map(text));
  if(plan.errors.length) throw new Error('Unmatched or nested keep markers. Use one ¤keep and one ¤endkeep on separate paragraphs within the same scene.');
  const result=blocks.map(block=>({...block}));
  plan.groups.forEach(({start,end},index)=>{
    for(let i=start+1;i<end;i++) result[i].keepGroup=String(index+1);
  });
  return result.filter(block=>!keepMarker(text(block)));
}

export function keepSelection(root, selection) {
  const state=decorateKeepGroups(root);
  if(!selection?.rangeCount) return {...state,selected:[],group:null};
  const range=selection.getRangeAt(0);
  if(!root.contains(range.startContainer) || !root.contains(range.endContainer)) return {...state,selected:[],group:null};
  const selected=state.paragraphs.filter(p=>{
    if(selection.isCollapsed) return p===range.startContainer || p.contains(range.startContainer);
    const pr=p.ownerDocument.createRange();pr.selectNodeContents(p);
    return range.compareBoundaryPoints(Range.END_TO_START,pr)<0 && range.compareBoundaryPoints(Range.START_TO_END,pr)>0;
  });
  const group=state.groups.find(g=>selected.some(p=>state.paragraphs.indexOf(p)>=g.start && state.paragraphs.indexOf(p)<=g.end));
  return {...state,selected,group};
}

export function changeKeepGroup(root, selection, remove=false) {
  const state=keepSelection(root,selection);
  if(remove ? !state.group : selection.isCollapsed || !state.selected.length || state.group) return false;
  let first,last;
  if(remove) {first=state.paragraphs[state.group.start];last=state.paragraphs[state.group.end];}
  else {
    first=state.selected[0];last=state.selected.at(-1);
    // Include complete blockquotes when a selection touches their paragraphs.
    while(first.parentElement!==root) first=first.parentElement;
    while(last.parentElement!==root) last=last.parentElement;
  }
  if(first.parentElement!==last.parentElement) return false;
  const range=root.ownerDocument.createRange();range.setStart(first,0);range.setEnd(last,last.childNodes.length);
  const holder=root.ownerDocument.createElement('div');holder.append(range.cloneContents());
  holder.querySelectorAll('[data-sidecar-chrome]').forEach(n=>n.remove());
  if(remove) {
    for(const p of keepParagraphs(holder)) if(keepMarker(p.textContent)) p.remove();
  } else {
    if(keepParagraphs(holder).some(p=>keepMarker(p.textContent))) return false;
    holder.innerHTML='<p>¤keep</p>'+holder.innerHTML+'<p>¤endkeep</p>';
  }
  root.focus();selection.removeAllRanges();selection.addRange(range);
  return root.ownerDocument.execCommand('insertHTML',false,holder.innerHTML);
}
