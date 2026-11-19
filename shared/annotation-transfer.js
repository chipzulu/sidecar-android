import {fileKind,sharedBase} from './peer-state.js';
import {decodeNote} from './annotation-brush.js';
const text=f=>new TextDecoder().decode(f.bytes);
export function proseOnly(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('template[data-sidecar-annotations]').forEach(n=>n.remove());doc.querySelectorAll('mark[data-annotation]').forEach(n=>n.replaceWith(...n.childNodes));doc.body.normalize();return doc.body.innerHTML;}
function annotations(html){const doc=new DOMParser().parseFromString(html,'text/html');return JSON.stringify([...doc.querySelectorAll('template[data-sidecar-annotations]')].map(n=>n.dataset.sidecarAnnotations));}
export function annotationPaths(base,source){
 if(!base?.entries)throw Error('A shared base is required for annotation-only transfer. Use Send changes or Receive changes first.');
 const current=new Map(source.map(f=>[f.path,f])),selected=new Set();
 for(const path of new Set([...Object.keys(base.entries),...current.keys()])){
  const old=base.entries[path],now=current.get(path);if(old?.sha===now?.sha)continue;
  const kind=fileKind(path);
  if(kind==='scene'){
   if(!old?.bytes||!now)continue;
   if(proseOnly(text(old))===proseOnly(text(now)))selected.add(path);
   else if(annotations(text(old))!==annotations(text(now)))throw Error('This annotation needs its scene changes: '+path+'. Use the full changes action.');
  }else if(kind==='annotation'){
   const note=decodeNote(text(now||old));if(!note)throw Error('Cannot verify annotation dependencies: '+path);
   const scene=current.get(note.path),before=base.entries[note.path];
   if(!scene||!before?.bytes||proseOnly(text(scene))!==proseOnly(text(before)))throw Error('This annotation needs its scene changes: '+note.path+'. Use the full changes action.');
   selected.add(path);
   // Its inline representation must travel with the note record when it changed.
   if(scene.sha!==before.sha)selected.add(note.path);
  }
 }
 return selected;
}
export function selectedFiles(original,source,paths){const files=new Map(original.map(f=>[f.path,f])),incoming=new Map(source.map(f=>[f.path,f]));for(const path of paths){if(incoming.has(path))files.set(path,incoming.get(path));else files.delete(path);}return [...files.values()];}
export function selectedBase(base,repository,branch,head,remote,paths){
 const full=sharedBase(repository,branch,head,remote),entries={...base.entries};for(const path of paths){if(full.entries[path])entries[path]=full.entries[path];else delete entries[path];}
 const complete=new Set([...Object.keys(entries),...Object.keys(full.entries)]);
 const partial=[...complete].some(path=>entries[path]?.sha!==full.entries[path]?.sha);
 return {...base,entries,commit:partial?base.commit:head,partial,observedHead:head};
}
export function guardAnnotationSend(base,local,remote,paths){const l=new Map(local.map(f=>[f.path,f.sha])),r=new Map(remote.map(f=>[f.path,f.sha]));for(const p of paths)if(r.get(p)!==base.entries[p]?.sha&&r.get(p)!==l.get(p))throw Error('Conflicting annotation changes: '+p+'. Receive changes before sending.');}
