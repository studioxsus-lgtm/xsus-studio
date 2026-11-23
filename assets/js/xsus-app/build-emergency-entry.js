// Independent recovery entry: keeps generation usable when optional builder UI modules fail.
// Does not replace the normal chat handler when it initializes successfully.
const button=document.getElementById('sendBtn');
const prompt=document.getElementById('prompt');
const status=document.createElement('p');
status.id='xsusBuildRecoveryStatus';
status.setAttribute('role','status');
status.style.cssText='padding:10px 12px;font-size:13px;line-height:1.5;color:#c7e8ff;white-space:pre-wrap';
button?.insertAdjacentElement('afterend',status);
function message(value){status.textContent=value;}
async function recoverBuild(){
  const goal=prompt?.value?.trim();
  if(!goal){message('Describe the app you want to generate first.');prompt?.focus();return;}
  button.disabled=true;
  message('Generating your application…');
  try{
    const [{buildFromChatGoal}]=await Promise.all([import('./build-engine-chat-client.js')]);
    const result=await buildFromChatGoal(goal);
    const editor=document.getElementById('editorBody');
    if(!editor)throw Error('Editor panel unavailable');
    editor.replaceChildren();
    const tabs=document.createElement('div');
    tabs.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:12px';
    const source=document.createElement('textarea');
    source.readOnly=true;source.style.cssText='width:100%;height:45vh;background:#0b1527;color:#e5f4ff;padding:12px;font:12px monospace';
    const frame=document.createElement('iframe');
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('title','Generated application preview');
    frame.style.cssText='width:100%;min-height:65vh;border:0;background:white';
    frame.srcdoc=result.html;
    const preview=document.createElement('button');preview.type='button';preview.textContent='Preview';
    preview.onclick=()=>{source.hidden=true;frame.hidden=false;};
    tabs.append(preview);
    for(const [name,code] of Object.entries(result.files)){
      const tab=document.createElement('button');tab.type='button';tab.textContent=name;
      tab.onclick=()=>{frame.hidden=true;source.hidden=false;source.value=code;};
      tabs.append(tab);
    }
    source.hidden=true;
    editor.append(tabs,source,frame);
    try{sessionStorage.setItem('xsus-app:emergency-build',JSON.stringify({goal,files:result.files}));}catch{}
    message('Application generated. Preview and source files are available on the right.');
  }catch(error){message('Generation failed: '+(error?.message||'Unknown error'));}
  finally{button.disabled=false;}
}
button?.addEventListener('click',event=>{
  if(window.__xsusChatReady)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void recoverBuild();
},true);
window.addEventListener('error',event=>{
  if(!window.__xsusChatReady&&event.message)message('Builder initialization error: '+event.message);
});
window.addEventListener('unhandledrejection',event=>{
  if(!window.__xsusChatReady)message('Builder initialization failed: '+(event.reason?.message||'Module unavailable'));
});
