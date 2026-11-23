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
const RECOVERY_KEY='xsus-app:emergency-build:v2';
function persistBuild(goal,files){
  try{localStorage.setItem(RECOVERY_KEY,JSON.stringify({goal,files}));return true;}
  catch{message('Browser storage is unavailable. Export your code before refreshing.');return false;}
}
function renderBuild(goal,files){
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
  const doc=new DOMParser().parseFromString(files['index.html'],'text/html');
  doc.querySelectorAll('script,link,iframe,object,embed,base,meta[http-equiv]').forEach(node=>node.remove());
  const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';
  csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(csp);
  const style=doc.createElement('style');style.textContent=files['styles.css'];doc.head.append(style);
  const script=doc.createElement('script');script.textContent=files['main.js'];doc.body.append(script);
  frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
  const preview=document.createElement('button');preview.type='button';preview.textContent='Preview';
  preview.onclick=()=>{source.hidden=true;frame.hidden=false;};
  tabs.append(preview);
  for(const [name,code] of Object.entries(files)){
    const tab=document.createElement('button');tab.type='button';tab.textContent=name;
    tab.onclick=()=>{frame.hidden=true;source.hidden=false;source.value=code;};
    tabs.append(tab);
  }
  source.hidden=true;
  editor.append(tabs,source,frame);
}
async function recoverBuild(){
  const goal=prompt?.value?.trim();
  if(!goal){message('Describe the app you want to generate first.');prompt?.focus();return;}
  button.disabled=true;
  message('Generating your application…');
  try{
    const [{buildFromChatGoal}]=await Promise.all([import('./build-engine-chat-client.js?v=reservation2')]);
    const result=await buildFromChatGoal(goal);
    renderBuild(goal,result.files);
    if(!persistBuild(goal,result.files))return;
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
// Recover a previously generated app if the primary builder failed to initialize.
window.addEventListener('load',()=>{
  setTimeout(()=>{
    if(window.__xsusChatReady)return;
    try{
      const saved=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null');
      if(!saved||!saved.files||!['index.html','styles.css','main.js'].every(key=>typeof saved.files[key]==='string'))return;
      renderBuild(saved.goal,saved.files);
      message('Previously generated application restored from browser storage.');
    }catch(error){message('Saved application could not be restored: '+(error?.message||'invalid data'));}
  },0);
});
window.addEventListener('error',event=>{
  if(!window.__xsusChatReady&&event.message)message('Builder initialization error: '+event.message);
});
window.addEventListener('unhandledrejection',event=>{
  if(!window.__xsusChatReady)message('Builder initialization failed: '+(event.reason?.message||'Module unavailable'));
});
