import {listBooks,readBook,workKey} from './storage.js';

export function mountLibrary({open,add,error,options}){
 const $=id=>document.getElementById(id);let books=[],index=0,revision=0,urls=[],opening=false;
 const tiles=()=>[...books,{id:'add',title:'Add a book'}];
 function revoke(){for(const url of urls)URL.revokeObjectURL(url);urls=[];}
 function select(n){index=Math.max(0,Math.min(books.length,n));void draw();}
 async function draw(){
  const ticket=++revision;revoke();const all=tiles(),item=all[index];$('library-track').replaceChildren();
  $('library-previous').disabled=index===0;$('library-next').disabled=index===books.length;
  $('library-position').textContent=`${index+1} of ${all.length}`;
  $('book-menu-open').hidden=item.id==='add';$('book-menu-open').onclick=()=>options(item);$('library-title').textContent=item.title;$('library-details').replaceChildren();
  for(const n of [index-1,index,index+1]){
   if(n<0||n>=all.length){const spacer=document.createElement('span');spacer.className='shelf-spacer';spacer.setAttribute('aria-hidden','true');$('library-track').append(spacer);continue;}
   const row=all[n],button=document.createElement('button');button.className='shelf-book'+(n===index?' selected':' neighbour');button.dataset.bookId=row.id;button.setAttribute('aria-label',row.id==='add'?'Add a book':n===index?'Open '+row.title:'Select '+row.title);
   const face=document.createElement('span');face.className='shelf-cover';face.textContent=row.id==='add'?'+':row.title;button.append(face);
   if(row.id==='add')button.classList.add('add-book');
   button.onclick=()=>{if(n!==index){select(n);return;}if(row.id==='add'){add();return;}if(opening)return;opening=true;button.disabled=true;Promise.resolve(open(row.id)).catch(e=>error(e.message)).finally(()=>{opening=false;button.disabled=false;});};
   $('library-track').append(button);
   if(row.id!=='add')void readBook(row.id).then(book=>{
    if(ticket!==revision||!book)return;
    let cover;for(const ext of ['png','jpeg','jpg']){cover=book.files.find(f=>f.path.toLowerCase()===`book/cards/cover.${ext}`);if(cover)break;}
    if(!cover)return;const url=URL.createObjectURL(new Blob([cover.bytes],{type:/\.png$/i.test(cover.path)?'image/png':'image/jpeg'}));urls.push(url);
    const img=document.createElement('img');img.alt=row.title+' cover';img.src=url;img.onerror=()=>{face.textContent=row.title;};face.replaceChildren(img);
   }).catch(e=>error(e.message));
  }
  const line=text=>{const p=document.createElement('p');p.textContent=text;$('library-details').append(p);};
  if(item.id==='add'){line('Bring a book here from your GitHub backup.');line('Downloaded books remain available offline.');return;}
  line('Available offline');
  if(item.writerStrokes)line('Writer draft: '+item.writerStrokes+' strokes saved on this device (not sent to GitHub).');
  let notes=0;try{notes=Object.values(JSON.parse(localStorage.getItem(workKey(item,'highlights'))||'{}')).filter(r=>r.dirty&&!r.discarded).length;}catch{}
  if(notes)line(`${notes} annotation${notes===1?'':'s'} waiting to send`);
  line(item.hasLocalWork?'Local edits stored on this device':'No local edits');
  line('GitHub · '+item.connection.repository+' · '+item.connection.branch);
  const date=value=>value?new Date(value).toLocaleString(): 'Not yet';
  line('Last received: '+date(item.lastReceivedAt));line('Last annotation send: '+date(item.lastSentAt));
  line(item.remoteStatus==='not-checked'?'Remote changes: not checked':(item.remoteStatus==='up-to-date'?'Backup matches GitHub':'Different backup on GitHub')+' · checked '+date(item.remoteCheckedAt));
 }
 $('library-previous').onclick=()=>select(index-1);$('library-next').onclick=()=>select(index+1);
 $('library-add').onclick=()=>{select(books.length);add();};
 $('library').addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(index+(e.key==='ArrowRight'?1:-1));$('library-track').querySelector('.selected')?.focus({preventScroll:true});}});
 let start=null;const track=$('library-track');track.addEventListener('pointerdown',e=>{suppress=false;start={x:e.clientX,y:e.clientY};});track.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)){suppress=true;select(index+(dx<0?1:-1));}});track.addEventListener('pointercancel',()=>{start=null;});let suppress=false;track.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 return {async refresh(preferred){const selected=preferred||tiles()[index]?.id;books=(await listBooks()).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));const found=tiles().findIndex(b=>b.id===selected);index=found>=0?found:0;await draw();},dispose(){revision++;revoke();}};
}
