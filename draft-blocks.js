import {workKey} from './storage.js';
import {inlineFragment,sceneNotes,annotatedHtml} from './inline-notes.js';
import {tabletTextAllowed} from './shared/book-workflow.js';

const prefix='Book/Notes/Converted draft ';
const magic='<!-- sidecar-converted-draft:1\n';
export const draftBlockPath=id=>prefix+id+'.md';
const key=book=>workKey(book,'converted-drafts');
export function localBlocks(book){return JSON.parse(localStorage.getItem(key(book))||'{}');}
function persist(book,rows){localStorage.setItem(key(book),JSON.stringify(rows));}
export function encodeBlock(row){return magic+JSON.stringify(row).replace(/</g,'\\u003c')+'\n-->\n\n# Converted draft\n\nNotebook: '+row.notebook+'\n\n'+row.text+'\n';}
function valid(row){return row&&/^[a-f0-9-]{36}$/.test(row.id)&&typeof row.path==='string'&&typeof row.text==='string'&&typeof row.notebook==='string'&&typeof row.anchor==='string'&&['pending','assimilated','removed'].includes(row.state);}
export function allBlocks(book){
 const rows={};
 for(const f of book.files){if(!f.path.startsWith(prefix)||!f.path.endsWith('.md'))continue;
  const text=new TextDecoder().decode(f.bytes);if(!text.startsWith(magic))continue;
  try{const row=JSON.parse(text.slice(magic.length,text.indexOf('\n-->')));if(valid(row)&&!row.transaction&&draftBlockPath(row.id)===f.path)rows[row.id]=row;}catch{/* Unrecognized notes remain ordinary files. */}
 }
 return {...rows,...localBlocks(book)};
}
function saveBlock(book,row){if(!valid(row))throw Error('Invalid converted draft.');const rows=localBlocks(book);rows[row.id]=row;persist(book,rows);return row;}
export function reconcileBlocks(book,captured=[]){const rows=localBlocks(book);for(const [id,row] of captured)if(JSON.stringify(rows[id])===JSON.stringify(row))delete rows[id];persist(book,rows);}
export function anchorIndex(scene,row){
 const nodes=[...inlineFragment(scene.html).children];
 // Exact HTML anchors survive pagination; duplicates are deliberately not guessed.
 const matches=nodes.flatMap((n,i)=>n.outerHTML===row.anchor?[i]:[]);
 return matches.length===1?matches[0]:-1;
}
export function newBlock(book,scene,index){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 const node=inlineFragment(scene.html).children[index];if(!node)throw Error('Choose a manuscript paragraph first.');
 const row={id:crypto.randomUUID(),path:scene.path,anchor:node.outerHTML,notebook:'',text:'',state:'pending'};
 if(anchorIndex(scene,row)<0)throw Error('This paragraph is repeated. Choose a distinctive paragraph to place the draft after.');
 return row;
}
export function updateBlock(book,row,values){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 const latest=allBlocks(book)[row.id]||row;
 if(latest.transaction)throw Error('Assimilation needs recovery. Close this dialog, then open this draft under Configuration → BOOX Notes / converted drafts. Your text is kept.');
 if(latest.state!=='pending')throw Error('This draft has already been handled.');
 return saveBlock(book,{...latest,...values});
}
export function finishAssimilation(book,scene,row,storeAnnotatedScene){
 if(!row.transaction)return row;
 const {before,after}=row.transaction;
 if(scene.html===before)storeAnnotatedScene(book,scene,after);
 else if(scene.html!==after)throw Error('The scene changed during assimilation. Your draft is kept; do not insert it a second time.');
 const done={...row,state:'assimilated'};delete done.transaction;return saveBlock(book,done);
}
export function assimilateBlock(book,scene,row,storeAnnotatedScene){
 if(!tabletTextAllowed(book))throw Error('Manuscript editing is disabled for this book.');
 row=allBlocks(book)[row.id]||row;
 if(row.transaction)return finishAssimilation(book,scene,row,storeAnnotatedScene);
 if(row.state!=='pending')throw Error('This draft has already been handled.');
 const index=anchorIndex(scene,row);if(index<0)throw Error('The original paragraph changed or is ambiguous. Your draft is kept. Copy its text and choose a new insertion point.');
 if(!row.text.trim())throw Error('Paste some text before assimilating.');
 const root=document.createElement('div');root.append(inlineFragment(scene.html));
 const inserted=document.createDocumentFragment();
 for(const line of row.text.replace(/\r\n?/g,'\n').split(/\n+/)){if(!line.trim())continue;const p=document.createElement('p');p.textContent=line;inserted.append(p);}
 root.children[index].after(inserted);
 // Journal first. A failed second write can be completed without inserting twice.
 const journal=saveBlock(book,{...row,transaction:{before:scene.html,after:annotatedHtml(root,sceneNotes(scene.html))}});
 return finishAssimilation(book,scene,journal,storeAnnotatedScene);
}

export function appendDraftBlocks(source,rows,blockIndex){
 for(const row of rows){if(row.index!==blockIndex)continue;
  const block=document.createElement('div');block.className='converted-draft-block';block.dataset.convertedDraft=row.id;block.tabIndex=0;block.setAttribute('role','button');block.setAttribute('aria-label','Open converted draft'+(row.notebook?' from '+row.notebook:''));
  const heading=document.createElement('strong');heading.textContent='Draft · '+(row.notebook||'BOOX Notes')+' · not assimilated';block.append(heading);
  const text=document.createElement('p');text.textContent=row.text||'Tap to paste converted text';block.append(text);source.append(block);
 }
}
