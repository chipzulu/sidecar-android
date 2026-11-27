import {ReceivedFileCount} from './received-files.js';
import {unpackBook} from './shared/book-exchange.js';
import {importExchangeBook,exchangeEntry} from './storage.js';
import {blobSha} from './api.js';
import {bookModel} from './model.js';

let outbound=null;
export function sendPairedReturn(bytes,title,progress){
 if(outbound)throw Error('A return is already being sent.');
 const bridge=window.SidecarBookInbox,job=crypto.randomUUID();
 return new Promise((resolve,reject)=>{
   const item={job,bytes,progress,resolve,reject};
   item.renew=()=>{
     clearTimeout(item.timer);
     item.timer=setTimeout(()=>{
       if(outbound!==item)return;
       outbound=null;bridge.postMessage(JSON.stringify({op:'cancel-return'}));
       reject(Error('PC did not confirm receipt. Keep Desktop Sidecar open on the same Wi-Fi and try again. Your edits are saved.'));
     },55000);
   };
   outbound=item;item.renew();
   bridge.postMessage(JSON.stringify({op:'queue',job,title,size:bytes.length}));
 });
}
function handleReturn(bridge,m){
 if(!m.type.startsWith('return-'))return false;
 const item=outbound;
 if(!item)return true;
 if(m.type==='return-queued'){item.progress('Waiting for '+m.name+'… Keep the Reader open.');}
 else if(m.type==='return-error'){clearTimeout(item.timer);outbound=null;item.reject(Error(m.message));}
 else if(item.job===m.job&&m.type==='return-chunk'){
   item.renew();const chunk=item.bytes.subarray(m.offset,m.offset+131072);
   if(m.offset===0)item.count=new ReceivedFileCount();
   item.count.push(chunk);
   let binary='';for(let i=0;i<chunk.length;i+=8192)binary+=String.fromCharCode(...chunk.subarray(i,i+8192));
   bridge.postMessage(JSON.stringify({id:m.id,seq:m.seq,result:btoa(binary)}));
   item.progress('Sending '+item.count.files+' files · '+(m.offset+chunk.length).toLocaleString()+' / '+item.bytes.length.toLocaleString()+' bytes');
 }else if(item.job===m.job&&m.type==='return-delivered'){
   clearTimeout(item.timer);outbound=null;item.resolve('Received on PC. Choose Review tablet changes in Desktop Sidecar.');
 }
 return true;
}

export function enableBookInbox({unavailable,added,notice}){
 const bridge=window.SidecarBookInbox;
 if(!bridge)return;
 let current=null,hideTimer;
 const display=document.createElement('output');
 display.id='book-receive-progress';display.hidden=true;display.setAttribute('aria-live','off');document.body.append(display);
 function show(text,finished=false){
   clearTimeout(hideTimer);display.textContent=text;display.hidden=false;
   if(finished)hideTimer=setTimeout(()=>{display.hidden=true;},10000);
 }
 function receiving(){
   const {title,count,files,received,size}=current;
   const total=Number.isInteger(files)?' / '+files:'';
   show(title+' · Receiving '+count.files+total+' files · '+received.toLocaleString()+' / '+size.toLocaleString()+' bytes');
 }
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
   if(handleReturn(bridge,m))return;
   if(m.type==='end'){
     if(current?.id===m.id){
       if(current.accepted&&!current.complete)show(current.title+' · Transfer interrupted after '+current.count.files+' files.',true);
       clear();
     }
     return;
   }
   let result='failed';
   try{
     if(m.type==='offer'){
       clear();
       if(unavailable())result='busy';
       else{
         const entry=await exchangeEntry(m.book);
         if(entry)result=entry.exchangeRevision===m.revision?'duplicate':'kept';
         else{current={...m,parts:[],received:0,count:new ReceivedFileCount(),nextUpdate:0};result=await prompt(m);
           if(result==='accept'&&current?.id===m.id){current.accepted=true;receiving();}}
       }
     }else if(current?.id===m.id){
       if(m.type==='chunk'){
         const bytes=Uint8Array.from(atob(m.data),c=>c.charCodeAt(0));
         current.received+=bytes.length;if(current.received>current.size)throw Error('Invalid transfer size.');
         current.parts.push(bytes);current.count.push(bytes);result='ok';
         if(performance.now()>=current.nextUpdate||current.received===current.size){
           receiving();current.nextUpdate=performance.now()+220;
         }
       }else if(m.type==='import'){
         if(current.received!==current.size)throw Error('Incomplete transfer.');
         show(current.title+' · Received '+current.count.files+' files · checking book…');
         const file=new Blob(current.parts);current.parts=[];
         const copy=await unpackBook(file);
         if(copy.exchangeId!==current.book||copy.exchangeRevision!==current.revision)throw Error('The book differs from the invitation.');
         for(const f of copy.files)f.sha=await blobSha(f.bytes);
         copy.title=bookModel(copy).title;
         show(copy.title+' · Saving '+copy.files.length+' files to library…');
         const saved=await importExchangeBook(copy,{activate:false});
         current.complete=true;show(copy.title+' · '+copy.files.length+' files received and saved.',true);
         result=saved.duplicate?'duplicate':'added';
         await added(saved.book).catch(e=>notice(e.message));
       }
     }
   }catch(e){if(current){current.complete=true;show('Receive failed · '+e.message,true);}notice(e.message);}
   bridge.postMessage(JSON.stringify({id:m.id,seq:m.seq,result}));
 };
 bridge.postMessage('ready');
}
