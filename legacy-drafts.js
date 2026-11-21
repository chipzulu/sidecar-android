// Recovery and backup only; no creation, editing, anchoring or BOOX Notes integration.
import {workKey} from './storage.js';

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
  try{const row=JSON.parse(text.slice(magic.length,text.indexOf('\n-->')));if(valid(row)&&draftBlockPath(row.id)===f.path)rows[row.id]=row;}catch{/* Unrecognized notes remain ordinary files. */}
 }
 return {...rows,...localBlocks(book)};
}
export function reconcileBlocks(book,captured=[]){const rows=localBlocks(book);for(const [id,row] of captured)if(JSON.stringify(rows[id])===JSON.stringify(row))delete rows[id];persist(book,rows);}
