const key='sidecar-input-events';
let events=[];try{events=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(events))events=[];}catch{}
let native=[],last=0;
export function logEvent(message){events.push(new Date().toISOString()+' WEB '+message);events=events.slice(-120);try{localStorage.setItem(key,JSON.stringify(events));}catch{}render();}
function render(){for(const el of document.querySelectorAll('[data-input-events]'))el.textContent=[...events,...native].join('\n');}
export function nativeEvents(info){if(Array.isArray(info.events))native=info.events.filter(x=>typeof x==='string').slice(-120);render();}
export function eventPanel(parent){const section=document.createElement('section');section.innerHTML='<h3>Recent input events</h3><p>No manuscript text or tokens are recorded. WEB and APK logs are shown separately.</p><pre data-input-events style="max-height:45vh;overflow:auto;white-space:pre-wrap;font:12px/1.5 monospace"></pre><button type="button">Copy event log</button>';section.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText([...events,...native].join('\n'));}catch{section.querySelector('pre').focus();}};parent.append(section);render();}
// Only event type and element identity, never field values, text or URLs.
for(const type of ['pointerdown','pointerup','click'])window.addEventListener(type,e=>{
 if(type!=='click'&&performance.now()-last<500)return;last=performance.now();
 const node=e.target.closest?.('button,a,select,summary,[role=separator]');
 if(!node&&e.target.closest?.('svg.annotation-ink')&&e.pointerType!=='touch')return;
 logEvent(type+' '+(e.pointerType||'compat')+' touch='+(e.sourceCapabilities?.firesTouchEvents===true)+' target='+(node?.id||node?.tagName||e.target.tagName||'unknown')+' writer='+document.body.classList.contains('writer-pen-active'));
},true);
window.addEventListener('pagehide',()=>logEvent('page hidden/navigation'));
window.addEventListener('focus',()=>logEvent('window focus'));window.addEventListener('blur',()=>logEvent('window blur'));
logEvent('page loaded '+(location.pathname.endsWith('update.html')?'update':'reader'));
