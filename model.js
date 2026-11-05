import {compareOrderedPaths,chapterHeadingParts,chapterDisplayName,sceneHeadingParts,orderedDisplayName} from './shared/structure.js';
import {decodeHtmlBytes} from './shared/file-text.js';
export {chapterHeadingParts,sceneHeadingParts};
export function bookModel(snapshot) {
  const scenes=snapshot.files.filter(f=>/^Book\/Chapters\/.+\.html?$/i.test(f.path)&&!f.path.split('/').slice(2,-1).some(p=>p.toLowerCase()==='notes')).sort((a,b)=>compareOrderedPaths(a.path,b.path));
  const chapters=[];
  for(const scene of scenes){const relative=scene.path.slice('Book/Chapters/'.length),parts=relative.split('/'),key=parts.length>1?parts[0]:'';
    let chapter=chapters.find(c=>c.key===key);if(!chapter){chapter={key,name:key?chapterDisplayName(key):'Manuscript',scenes:[]};chapters.push(chapter);}
    chapter.scenes.push({...scene,name:orderedDisplayName(parts.at(-1)),filename:parts.at(-1),html:decodeHtmlBytes(scene.bytes)});
  }
  const card=snapshot.files.find(f=>f.path.toLowerCase()==='book/cards/title.md');const fields={};
  if(card)for(const line of new TextDecoder().decode(card.bytes).split(/\r?\n/)){const match=line.match(/^\s*(title|subtitle|penname|author)\s*:\s*(.*?)\s*$/i);if(match)fields[match[1].toLowerCase()]=match[2];}
  let cover=null;for(const ext of ['png','jpeg','jpg']){cover=snapshot.files.find(f=>f.path.toLowerCase()===`book/cards/cover.${ext}`);if(cover)break;}
  return {chapters,cover,title:fields.title||snapshot.repository.split('/')[1],subtitle:fields.subtitle||'',author:fields.penname||fields.author||''};
}
