const key='sidecar-input-events';
let events=[];try{events=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(events))events=[];}catch{}
let native=[],last=0;
export function logEvent(message){events.push(new Date().toISOString()+' WEB '+message);events=events.slice(-120);try{localStorage.setItem(key,JSON.stringify(events));}catch{}render();}
function render(){for(const el of document.querySelectorAll('[data-input-events]'))if(!el.parentElement.hidden)el.textContent=[...events,...native].join('\n');}
export function nativeEvents(info){if(Array.isArray(info.events))native=info.events.filter(x=>typeof x==='string').slice(-120);render();}
export function eventPanel(parent){
 const pref='sidecar-event-log-expanded';
 const section=document.createElement('section');
 section.innerHTML='<label><input type="checkbox"> Show event log</label><div hidden><p>Recent input events from the Reader and BOOX app.</p><pre data-input-events tabindex="0"></pre><button type="button">Copy event log</button></div>';
 const toggle=section.querySelector('input'),body=section.querySelector('div');
 toggle.checked=localStorage.getItem(pref)==='true';
 body.hidden=!toggle.checked;
 toggle.onchange=()=>{body.hidden=!toggle.checked;localStorage.setItem(pref,String(toggle.checked));if(toggle.checked)render();};
 section.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText([...events,...native].join('\n'));}catch{section.querySelector('pre').focus();}};
 parent.append(section);render();
}
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
