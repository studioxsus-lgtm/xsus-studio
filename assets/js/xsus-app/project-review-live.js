import {getSupabaseClient} from './auth-session.js';
// Authenticated, owner-scoped XSUS App static review; never deploys applications.
const ENDPOINT='https://xsus-app-deployment-api.onrender.com/api/projects/review';
const allowed=['https://www.xsusstudio.com','https://xsusstudio.com'];
if(allowed.includes(location.origin)){
 const labels={
  en:['Project security review','Saved project UUID','Check project','Sign in to XSUS Studio first.','Checking authenticated project ownership…','Review ready (not deployed).','Project could not be reviewed. Check ownership, saved files and service.','Review service unavailable.'],
  sq:['Kontrolli i sigurisë së projektit','UUID i projektit të ruajtur','Kontrollo projektin','Identifikohu fillimisht në XSUS Studio.','Po kontrollohet pronësia e projektit…','Projekti kaloi kontrollin (nuk u publikua).','Projekti nuk u verifikua. Kontrollo pronësinë, skedarët dhe shërbimin.','Shërbimi i kontrollit nuk është i disponueshëm.'],
  fr:['Contrôle de sécurité du projet','UUID du projet enregistré','Vérifier le projet','Connectez-vous à XSUS Studio.','Vérification de la propriété du projet…','Projet validé (non déployé).','Le projet ne peut pas être validé. Vérifiez les droits, les fichiers et le service.','Service de vérification indisponible.']
 };
 const section=document.createElement('section');
 section.id='xsus-project-review-live';
 section.style.cssText='margin:16px auto;padding:16px;max-width:760px;border:1px solid #28506b;border-radius:12px;background:#0b182a;color:#e6faff';
 const heading=document.createElement('h3'),form=document.createElement('form'),input=document.createElement('input'),button=document.createElement('button'),status=document.createElement('p');
 input.type='text';input.required=true;input.maxLength=36;input.autocomplete='off';
 input.style.cssText='width:min(100%,380px);padding:10px;background:#101e31;color:white;border:1px solid #36758c;border-radius:6px;margin:8px';
 button.type='submit';button.style.cssText='padding:10px;border:1px solid #36758c;border-radius:6px;background:#123248;color:white';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const render=()=>{const l=labels[document.documentElement.lang?.slice(0,2)]||labels.en;
  heading.textContent=l[0];input.placeholder=l[1];input.setAttribute('aria-label',l[1]);button.textContent=l[2];};
 form.append(input,button);section.append(heading,form,status);
 const workspace=document.getElementById('workspace');
 (workspace||document.querySelector('main')||document.body).append(section);
 // Always-visible launcher: the builder is a viewport-sized workspace and
 // content appended after it is otherwise unreachable on mobile.
 const launcher=document.createElement('button');
 launcher.type='button';
 launcher.id='xsus-project-review-open';
 launcher.textContent='Project review';
 launcher.setAttribute('aria-controls',section.id);
 launcher.setAttribute('aria-expanded','false');
 launcher.style.cssText='position:fixed;right:12px;bottom:82px;z-index:2147483000;padding:11px 14px;border:1px solid #45b9d8;border-radius:12px;background:#102e44;color:#fff;font:600 13px system-ui;box-shadow:0 4px 18px #0008;cursor:pointer';
 section.hidden=true;
 section.style.cssText+=';position:fixed;right:12px;bottom:140px;z-index:2147483000;width:min(440px,calc(100vw - 24px));max-height:65vh;overflow:auto;box-shadow:0 12px 40px #000b';
 const close=document.createElement('button');
 close.type='button';close.textContent='×';close.setAttribute('aria-label','Close project review');
 close.style.cssText='float:right;background:transparent;color:white;border:0;font-size:24px;cursor:pointer';
 section.prepend(close);
 const toggle=(show)=>{section.hidden=!show;launcher.setAttribute('aria-expanded',String(show));if(show)input.focus();};
 launcher.addEventListener('click',()=>toggle(section.hidden));
 close.addEventListener('click',()=>toggle(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!section.hidden)toggle(false);});
 document.body.append(launcher);
 render();
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(button.disabled)return;
  const l=labels[document.documentElement.lang?.slice(0,2)]||labels.en;
  const projectId=input.value.trim();
  if(!uuid.test(projectId)){status.textContent=l[6];return;}
  button.disabled=true;
  try{
   const supabase=await getSupabaseClient();
   const {data,error}=await supabase.auth.getSession();
   const token=data?.session?.access_token;
   if(error||!token){status.textContent=l[3];return;}
   status.textContent=l[4];
   const response=await fetch(ENDPOINT,{method:'POST',headers:{
    'content-type':'application/json',authorization:'Bearer '+token},
    body:JSON.stringify({projectId}),signal:AbortSignal.timeout(15000),cache:'no-store'});
   const result=await response.json();
   status.textContent=response.ok&&result.status==='ready-for-review'&&result.deployed===false?l[5]:l[6];
  }catch{status.textContent=l[7];}
  finally{button.disabled=false;}
 });
}
