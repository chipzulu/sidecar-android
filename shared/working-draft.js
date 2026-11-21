export const DRAFT_ATTRIBUTE='data-working-draft';
export const validDraftId=value=>/^[a-f0-9-]{36}$/.test(value||'');
export function draftTextHtml(text,draft=false){
 const id=draft?crypto.randomUUID():null,root=document.createElement('div');
 for(const line of String(text).replace(/\r\n?/g,'\n').split('\n')){const p=document.createElement('p'),node=draft?document.createElement('span'):p;if(draft){node.dataset.workingDraft=id;p.append(node);}node.textContent=line;if(!line)node.append(document.createElement('br'));root.append(p);}
 return root.innerHTML;
}
export function assimilateDraft(root,id){if(!validDraftId(id))throw Error('Invalid working draft.');let count=0;for(const node of root.querySelectorAll('[data-working-draft]'))if(node.dataset.workingDraft===id){node.replaceWith(...node.childNodes);count++;}return count;}
export function assertPublicationReady(chapters){
 const pending=[];for(const chapter of chapters)for(const scene of chapter.scenes||[])if(scene.blocks?.some(b=>b.workingDraft||b.runs?.some(r=>r.workingDraft)))pending.push((chapter.title||chapter.name||'Chapter')+' / '+(scene.subtitle||scene.title||scene.name||scene.path||'Scene'));
 if(pending.length)throw Error('Publication export stopped. Assimilate working drafts in:\n'+pending.join('\n'));
}
