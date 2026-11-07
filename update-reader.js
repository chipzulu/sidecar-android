const status=document.getElementById('status');
const retry=document.getElementById('retry');
retry.onclick=()=>location.reload();

async function update(){
  const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  await reg.update();
  const worker=reg.installing || reg.waiting || reg.active;
  if(!worker)throw Error('Chrome could not start the update.');
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(Error('Update timed out. Check your connection and try again.')),90000);
    function finish(error){
      clearTimeout(timeout);
      worker.removeEventListener('statechange',check);
      if(error)reject(error);else resolve();
    }
    function check(){
      if(worker.state==='redundant')finish(Error('Some reader files could not be installed. Try again after GitHub Pages finishes publishing.'));
      if(worker.state==='installed')worker.postMessage('activate-reader-update');
      if(worker.state==='activated')finish();
    }
    worker.addEventListener('statechange',check);
    check();
  });
  const version=await new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timeout=setTimeout(()=>{channel.port1.close();reject(Error('The update page is ready, but the new reader files are still being published. Try again shortly.'));},6000);
    channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data);};
    worker.postMessage('reader-version',[channel.port2]);
  });
  status.textContent='Reader '+version+' is ready.';
  document.getElementById('open').hidden=false;
}
update().catch(error=>{status.textContent=error.message;retry.hidden=false;});
