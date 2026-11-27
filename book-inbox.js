import {unpackBook} from './shared/book-exchange.js';
import {importExchangeBook,exchangeEntry} from './storage.js';
import {blobSha} from './api.js';
import {bookModel} from './model.js';

export function enableBookInbox({unavailable,added,notice}){
 const bridge=window.SidecarBookInbox;
 if(!bridge)return;
 let current=null;
 function clear(){
   if(current?.dialog){current.dialog.close();current.dialog.remove();}
   current=null;
 }
 function prompt(offer){
   const dialog=document.createElement('dialog'),heading=document.createElement('h2'),sender=document.createElement('p');
   heading.textContent='Add “'+offer.title+'” to your library?';sender.textContent='From '+offer.from;
   const accept=document.createElement('button'),decline=document.createElement('button');
   accept.textContent='Add book';decline.textContent='Decline';dialog.append(heading,sender,decline,accept);
   document.body.append(dialog);current.dialog=dialog;
   return new Promise(resolve=>{
     let choice='declined';
     accept.onclick=()=>{choice='accept';dialog.close();};decline.onclick=()=>dialog.close();
     dialog.onclose=()=>{dialog.remove();resolve(choice);};dialog.showModal();
   });
 }
 bridge.onmessage=async event=>{
   const m=JSON.parse(event.data);
   if(m.type==='end'){if(current?.id===m.id)clear();return;}
   let result='failed';
   try{
     if(m.type==='offer'){
       clear();
       if(unavailable())result='busy';
       else{
         const entry=await exchangeEntry(m.book);
         if(entry)result=entry.exchangeRevision===m.revision?'duplicate':'kept';
         else{current={...m,parts:[],received:0};result=await prompt(m);}
       }
     }else if(current?.id===m.id){
       if(m.type==='chunk'){
         const bytes=Uint8Array.from(atob(m.data),c=>c.charCodeAt(0));
         current.received+=bytes.length;if(current.received>current.size)throw Error('Invalid transfer size.');
         current.parts.push(bytes);result='ok';
       }else if(m.type==='import'){
         if(current.received!==current.size)throw Error('Incomplete transfer.');
         const file=new Blob(current.parts);current.parts=[];
         const copy=await unpackBook(file);
         if(copy.exchangeId!==current.book||copy.exchangeRevision!==current.revision)throw Error('The book differs from the invitation.');
         for(const f of copy.files)f.sha=await blobSha(f.bytes);
         copy.title=bookModel(copy).title;
         const saved=await importExchangeBook(copy,{activate:false});
         result=saved.duplicate?'duplicate':'added';
         await added(saved.book).catch(e=>notice(e.message));
       }
     }
   }catch(e){notice(e.message);}
   bridge.postMessage(JSON.stringify({id:m.id,seq:m.seq,result}));
 };
 bridge.postMessage('ready');
}
