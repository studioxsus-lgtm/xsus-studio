import {getSupabaseClient,getUserAccessToken} from './auth-session.js';
// Branch-only staging integration. Generated files are untrusted and never executed in the parent origin.
const API='https://xsus-app-build-api-staging.onrender.com/api/projects/build-preview';
const ORIGINS=new Set(['https://www.xsusstudio.com','https://xsusstudio.com']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(ORIGINS.has(location.origin)){
 const panel=document.createElement('dialog');
 panel.id='xsus-build-preview-staging';
 panel.setAttribute('aria-label','XSUS App staging build preview');
 panel.style.cssText='width:min(760px,calc(100vw - 24px));max-height:90dvh;overflow:auto;border:1px solid #345b7a;border-radius:18px;background:#101e33;color:#e6faff;padding:20px;box-shadow:0 20px 70px #000b';
 const title=document.createElement('h2');title.textContent='XSUS App · Build Preview (Staging)';
 const note=document.createElement('p');note.textContent='Static preview only. No deployment or app-store publication.';note.style.color='#a6c5d7';
 const select=document.createElement('select');select.setAttribute('aria-label','Choose saved project');select.style.cssText='width:100%;padding:12px;background:#0b192c;color:white;border:1px solid #345b7a;border-radius:9px';
 const build=document.createElement('button');build.textContent='Generate preview';build.type='button';
 const close=document.createElement('button');close.textContent='Close';close.type='button';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const frame=document.createElement('iframe');frame.title='Sandboxed XSUS App preview';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='width:100%;height:340px;border:1px solid #345b7a;border-radius:10px;background:white;display:none';
 const files=document.createElement('p');files.style.fontSize='12px';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin:12px 0';
 for(const button of [build,close])button.style.cssText='padding:10px 16px;border:1px solid #397c98;border-radius:9px;background:#183b59;color:white;cursor:pointer';
 actions.append(build,close);panel.append(title,note,select,actions,status,files,frame);document.body.append(panel);
 const launcher=document.createElement('button');launcher.type='button';launcher.textContent='Build Preview · Staging';launcher.style.cssText='position:fixed;right:14px;bottom:126px;z-index:2147482990;padding:10px 13px;border:1px solid #397c98;border-radius:999px;background:#122a40;color:#e9faff;font:600 12px system-ui;cursor:pointer;display:none';document.body.append(launcher);
 const open=async()=>{
  panel.showModal();status.textContent='Loading saved projects…';frame.style.display='none';frame.removeAttribute('srcdoc');files.textContent='';
  select.replaceChildren(new Option('Select a saved project',''));build.disabled=true;
  try{
   const client=await getSupabaseClient();const {data,error}=await client.auth.getUser();
   if(error||!data?.user?.id)throw new Error('Sign in to XSUS Studio first.');
   const {data:projects,error:queryError}=await client.from('xsus_builder_projects').select('id,name').eq('owner_id',data.user.id).order('created_at',{ascending:false}).limit(50);
   if(queryError)throw queryError;
   for(const project of projects||[]){if(UUID.test(project.id))select.add(new Option(String(project.name||'Project').slice(0,100),project.id));}
   status.textContent=select.options.length>1?'Choose a project to generate a static preview.':'No saved projects found.';
   build.disabled=select.options.length<2;
  }catch(error){status.textContent=error?.message==='Sign in to XSUS Studio first.'?error.message:'Unable to load projects.';}
 };
 launcher.addEventListener('click',()=>void open());
 close.addEventListener('click',()=>panel.close());
 panel.addEventListener('close',()=>{frame.removeAttribute('srcdoc');frame.style.display='none';});
 build.addEventListener('click',async()=>{
  const projectId=select.value;if(!UUID.test(projectId))return;
  build.disabled=true;status.textContent='Generating secure staging preview…';frame.style.display='none';frame.removeAttribute('srcdoc');
  try{
   const token=await getUserAccessToken();if(!token)throw new Error('Sign in to XSUS Studio first.');
   const response=await fetch(API,{method:'POST',mode:'cors',cache:'no-store',headers:{'authorization':'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({projectId}),signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw new Error('Preview request failed ('+response.status+').');
   const result=await response.json();
   if(result.projectId!==projectId||result.kind!=='static-preview'||result.requiresReview!==true||!Array.isArray(result.files))throw new Error('Invalid preview response.');
   const map=new Map(result.files.map(f=>[f.path,f.content]));
   if(map.size!==3||!['index.html','styles.css','main.js'].every(p=>typeof map.get(p)==='string'&&map.get(p).length>0))throw new Error('Incomplete preview files.');
   // Keep generated content isolated from the XSUS Studio origin. Deny external network and navigation.
   const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\'; base-uri \'none\'">';
   const css='<style>'+map.get('styles.css').replace(/<\\/style/gi,'<\\/style')+'</style>';
   const js='<script>'+map.get('main.js').replace(/<\\/script/gi,'<\\/script')+'<\\/script>';
   let html=map.get('index.html').replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi,'').replace(/<link\\b[^>]*rel=["\']stylesheet["\'][^>]*>/gi,'');
   html=html.replace(/<head[^>]*>/i,m=>m+policy+css);
   html=html.replace(/<\\/body>/i,js+'</body>');
   frame.srcdoc=html;frame.style.display='block';
   files.textContent='Generated: index.html · styles.css · main.js (review required)';
   status.textContent='Static preview ready. Not deployed.';
  }catch(error){status.textContent=error?.message?.startsWith('Preview request failed')?error.message:'Preview unavailable or response invalid.';}
  finally{build.disabled=false;}
 });
 const sync=()=>{launcher.style.display=document.getElementById('workspace')&&!document.getElementById('workspace').classList.contains('hidden')?'block':'none';};
 document.addEventListener('click',()=>queueMicrotask(sync));sync();
}
