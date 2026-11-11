import {repositoryName} from './api.js';
import {readCredential,writeCredential} from './token-vault.js';

export function mountCredentials({activate,lock,message,onBusy}){
  const $=id=>document.getElementById(id);
  let revision=0,working=false,record=null,editing=false,session=null;
  const repo=()=>repositoryName($('repository').value);
  function fields(){
    const saved=record?.kind==='remembered-token'&&typeof record.token==='string';
    const active=session?.repository===safeRepo();
    $('token-entry').hidden=!editing&&(saved||active);
    $('replace-token').hidden=editing||!(saved||active);
    $('forget-saved-token').hidden=!record&&!active;
    $('cancel-token').hidden=!editing||!(saved||active||record);
    $('save-token').textContent=$('remember-token').checked?'Save token':'Use token';
    $('credential-status').textContent=record&&!saved
      ?'The previous token used a passphrase. Paste a replacement token.'
      :saved?'Token saved on this device. Ready to use.'
      :active?'Token in use for this session. Not saved.'
      :'No token saved. Paste a GitHub token to connect.';
  }
  function safeRepo(){try{return repo();}catch{return '';}}
  async function refresh(){
    const request=++revision,repository=safeRepo();
    editing=false;record=null;$('token').value='';
    if(session?.repository!==repository){session=null;lock();}
    fields();
    if(!repository)return;
    try{
      const value=await readCredential(repository);
      if(request!==revision)return;
      record=value||null;fields();
    }catch(e){if(request===revision)message(e.message,true);}
  }
  async function ensure(){
    const repository=repo(),branch=$('branch').value.trim();
    ++revision;
    if(!branch)throw Error('Enter a branch, usually main.');
    const typed=$('token').value.trim();
    let token=typed;
    if(!typed){
      if(session?.repository===repository)token=session.token;
      else {
        const saved=await readCredential(repository);
        if(saved?.kind==='remembered-token')token=saved.token;
        else if(saved)throw Error('Paste a replacement token for this book. The previous token used a passphrase.');
      }
    }
    if(!token)throw Error('Paste a GitHub token for this book.');
    if(token.length>4096)throw Error('The token is too long. Paste only the GitHub token.');
    // Construct the client before persisting, so malformed input cannot replace a saved token.
    activate(repository,branch,token);
    if(typed){
      try{
        const next=$('remember-token').checked?{kind:'remembered-token',token}:null;
        await writeCredential(repository,next);record=next;
      }catch(e){lock();throw e;}
    }
    session={repository,token};editing=false;$('token').value='';fields();
  }
  async function run(action){
    if(working)return;
    working=true;onBusy(true);
    try{await action();}catch(e){message(e.message,true);}
    finally{working=false;onBusy(false);fields();}
  }
  $('save-token').onclick=()=>run(async()=>{
    await ensure();message('Token ready. Download or refresh the book to check GitHub access.');
  });
  $('replace-token').onclick=()=>{
    editing=true;$('token').value='';$('remember-token').checked=Boolean(record);
    fields();$('token').focus();
  };
  $('cancel-token').onclick=()=>{editing=false;$('token').value='';fields();};
  $('forget-saved-token').onclick=()=>run(async()=>{
    const repository=repo();
    await writeCredential(repository,null);
    record=null;session=null;lock();editing=false;$('token').value='';$('remember-token').checked=false;
    message('Token forgotten on this device. Your downloaded book remains available.');
  });
  $('remember-token').onchange=fields;
  $('token').oninput=()=>{editing=true;};
  $('token').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('save-token').click();}};
  $('repository').addEventListener('input',()=>{void refresh();});
  fields();void refresh();
  return {refresh,ensure};
}
