import {repositoryName} from './api.js';
import {sealToken,unsealToken,readCredential,writeCredential} from './token-vault.js';
export function mountCredentials({activate,lock,message,onBusy}){
  const $=id=>document.getElementById(id);let working=false,revision=0,exists=false;
  function clear(){for(const id of ['passphrase','confirm-passphrase'])$(id).value='';}
  function fields(){const remember=$('remember-token').checked;$('passphrase-label').hidden=!remember&&!exists;$('confirm-label').hidden=!remember;$('save-token').hidden=!remember;$('unlock-token').hidden=!exists;$('forget-saved-token').hidden=!exists;}
  async function refresh(){const current=++revision;try{const repo=repositoryName($('repository').value);const record=await readCredential(repo);if(current!==revision)return;exists=Boolean(record);$('credential-status').textContent=exists?'Encrypted token saved for this repository. Unlock it after reopening.':'No token saved for this repository.';}catch{if(current!==revision)return;exists=false;$('credential-status').textContent='Enter a repository to check saved credentials.';}fields();}
  async function run(action){if(working)return;working=true;onBusy(true);message('Working on the saved credential…');try{await action();}catch(error){message(error.message,true);}finally{clear();working=false;onBusy(false);fields();}}
  $('remember-token').onchange=()=>{clear();fields();};
  $('save-token').onclick=()=>run(async()=>{
    const repo=repositoryName($('repository').value),branch=$('branch').value.trim(),token=$('token').value.trim(),pass=$('passphrase').value;
    if(!branch)throw Error('Enter a branch, usually main.');
    if(pass!==$('confirm-passphrase').value)throw Error('The passphrases do not match. Please enter them again.');
    const record=await sealToken(repo,token,pass);await writeCredential(repo,record);
    activate(repo,branch,token);$('token').value='';$('remember-token').checked=false;await refresh();
    message('Token encrypted and saved on this device. GitHub is unlocked for this session; you can refresh the book.');
  });
  $('unlock-token').onclick=()=>run(async()=>{
    const repo=repositoryName($('repository').value),branch=$('branch').value.trim();if(!branch)throw Error('Enter a branch, usually main.');
    const record=await readCredential(repo);if(!record)throw Error('No saved token for this repository. Enter a new token.');
    const token=await unsealToken(repo,record,$('passphrase').value);activate(repo,branch,token);$('token').value='';message('GitHub unlocked for this session. You can refresh the book.');
  });
  $('forget-saved-token').onclick=()=>run(async()=>{
    const repo=repositoryName($('repository').value);
    if(!confirm(`Forget the saved token for ${repo}? Your offline book and reading settings will stay intact. This does not revoke the token on GitHub.`)){message('Saved token retained.');return;}
    await writeCredential(repo,null);lock();$('token').value='';$('remember-token').checked=false;await refresh();message('Saved token removed. Your book and settings are unchanged. Enter a new token and choose a new passphrase whenever you want.');
  });
  $('passphrase').onkeydown=event=>{if(event.key==='Enter'&&!$('remember-token').checked&&exists){event.preventDefault();$('unlock-token').click();}};
  $('repository').addEventListener('input',()=>{clear();refresh();});
  fields();refresh();return {refresh,clear,hasSaved:()=>exists};
}
