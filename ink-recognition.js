// Experimental BOOX-only conversion. Never mutates or replaces saved ink.
export function showRecognition(ink) {
 const dialog=document.createElement('dialog');dialog.className='ink-recognition';
 dialog.setAttribute('aria-label','Recognized handwriting');
 dialog.innerHTML='<h2>Recognized text</h2><p role="status"></p><textarea aria-label="Recognized text" readonly hidden></textarea><div><button data-copy disabled>Copy</button> <button data-close>Close</button></div>';
 const status=dialog.querySelector('[role=status]'),text=dialog.querySelector('textarea'),copy=dialog.querySelector('[data-copy]');
 document.body.append(dialog);dialog.showModal();
 return new Promise(resolve=>{
  const bridge=window.SidecarRecognition,id=crypto.randomUUID();let timer,finished=false;
  const previous=bridge?.onmessage;
  function cleanup(){clearTimeout(timer);if(bridge)bridge.onmessage=previous;}
  function close(){if(finished)return;finished=true;cleanup();dialog.close();dialog.remove();resolve();}
  dialog.querySelector('[data-close]').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(text.value);status.textContent='Copied. Your handwritten note is unchanged.';}catch{status.textContent='Copy is unavailable. Select the text and use the system Copy command.';text.focus();text.select();}};
  if(!bridge?.postMessage){status.textContent='Conversion requires BOOX APK 0.1.12 or newer. It is not available in the browser Reader.';return;}
  if(!ink?.strokes?.length){status.textContent='Write something in this note before converting.';return;}
  status.textContent='Converting on this BOOX… Your handwriting stays unchanged.';
  bridge.onmessage=event=>{
   if(finished)return;
   let result;try{result=JSON.parse(event.data);}catch{return;}
   if(result.id!==id)return;cleanup();
   if(result.error){status.textContent=result.error;return;}
   text.value=typeof result.text==='string'?result.text:'';text.hidden=false;copy.disabled=!text.value;
   status.textContent=text.value?'English recognition · handwriting unchanged.':'No text was recognized. Your handwriting is unchanged.';
  };
  timer=setTimeout(()=>{cleanup();status.textContent='Recognition did not respond. Your handwriting is unchanged. Close and try again.';},30000);
  try{bridge.postMessage(JSON.stringify({id,ink}));}catch{cleanup();status.textContent='Could not start BOOX recognition. Your handwriting is unchanged.';}
 });
}
