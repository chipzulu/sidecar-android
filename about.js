import {eventPanel,nativeEvents,logEvent} from './input-events.js';
const $=id=>document.getElementById(id);
const dialog=$('about-dialog'),bridge=window.SidecarApp;
if(bridge){
 bridge.onmessage=event=>{try{
  const info=JSON.parse(event.data);
  if(info.type!=='status')return;nativeEvents(info);
  $('paired-devices').hidden=info.pairing!==true;
  $('about-native-status').textContent=info.status;
  $('about-apk').hidden=false;$('about-apk').textContent='BOOX app '+info.version;
  $('config-eraser').hidden=false;$('config-eraser').textContent=info.eraser;
 }catch{/* Keep About usable if an older wrapper sends an unknown message. */}};
}
eventPanel(dialog);
$('about-open').onclick=()=>{
 $('coffee-reset-status').textContent='';
 logEvent('About opened');
 const d=window.sidecarInkDiagnostic;
 $('about-ink-diagnostic').textContent=d?`Last ${d.tool} session: ${d.begun} started, ${d.received} received, ${d.accepted} accepted, ${d.rejected} rejected. ${d.last}. Saved note: ${window.sidecarInkSavedCount??'not confirmed'} strokes.`:'No native handwriting session in this Reader window yet.';
 dialog.showModal();bridge?.postMessage('status');
};
$('about-close').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('config-eraser').onclick=()=>bridge?.postMessage('eraser');
$('about-reload').onclick=()=>{if(confirm('Reload Reader? Finish your current edit before reloading.')){if(bridge)bridge.postMessage('reload');else location.reload();}};

document.getElementById('configuration-toggle').addEventListener('click',()=>bridge?.postMessage('status'));

$('paired-devices').onclick=()=>bridge?.postMessage('paired-devices');
bridge?.postMessage('status');