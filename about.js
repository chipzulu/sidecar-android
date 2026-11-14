const $=id=>document.getElementById(id);
const dialog=$('about-dialog'),bridge=window.SidecarApp;
if(bridge){
 bridge.onmessage=event=>{try{
  const info=JSON.parse(event.data);
  if(info.type!=='status')return;
  $('about-native-status').textContent=info.status;
  $('about-apk').hidden=false;$('about-apk').textContent='BOOX app '+info.version;
  $('about-eraser').hidden=false;$('about-eraser').textContent=info.eraser;
 }catch{/* Keep About usable if an older wrapper sends an unknown message. */}};
}
$('about-open').onclick=()=>{dialog.showModal();bridge?.postMessage('status');};
$('about-close').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('about-eraser').onclick=()=>bridge?.postMessage('eraser');
$('about-reload').onclick=()=>{if(confirm('Reload Reader? Finish your current edit before reloading.')){if(bridge)bridge.postMessage('reload');else location.reload();}};
