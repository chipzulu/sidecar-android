export async function saveReturnFile(name,bytes){
 const bridge=window.SidecarReturnFile;
 if(!bridge){
   if(window.SidecarApp)throw Error('Install BOOX APK 0.1.22 or later to save tablet changes.');
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
   const link=document.createElement('a');
   link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
   return 'Download started. Copy the new .sidecar-return file to your PC.';
 }
 function send(op,fields={}){
   const id=crypto.randomUUID();
   return new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('The tablet did not confirm the file was saved.')),15000);
     bridge.onmessage=event=>{
       const reply=JSON.parse(event.data);if(reply.id!==id)return;
       clearTimeout(timer);reply.ok?resolve():reject(Error(reply.error));
     };
     bridge.postMessage(JSON.stringify({id,op,...fields}));
   });
 }
 try{
   await send('begin',{name,size:bytes.length});
   for(let offset=0;offset<bytes.length;offset+=32768){
     const data=btoa(String.fromCharCode(...bytes.subarray(offset,offset+32768)));
     await send('chunk',{data});
   }
   await send('finish');
   return 'Saved in BOOX Download. Copy the new .sidecar-return file to your PC.';
 }catch(e){bridge.postMessage(JSON.stringify({id:crypto.randomUUID(),op:'abort'}));throw e;}
 finally{bridge.onmessage=null;}
}
