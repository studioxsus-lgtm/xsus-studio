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
 section.setAttribute('role','dialog');
 section.setAttribute('aria-modal','true');
 section.setAttribute('aria-labelledby','xsus-review-title');
 const heading=document.createElement('h3'),form=document.createElement('form'),input=document.createElement('input'),button=document.createElement('button'),status=document.createElement('p');
 heading.id='xsus-review-title';
 input.type='text';input.required=true;input.maxLength=36;input.autocomplete='off';
 input.style.cssText='display:block;width:100%;box-sizing:border-box;padding:12px 14px;background:#0b192c;color:#fff;border:1px solid #365778;border-radius:10px;font:inherit;outline-offset:2px';
 button.type='submit';button.style.cssText='display:block;width:100%;margin-top:12px;padding:12px 16px;border:0;border-radius:10px;background:linear-gradient(100deg,#08a7c5,#6156dd);color:white;font:600 14px system-ui;cursor:pointer';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.style.cssText='font:13px/1.5 system-ui;color:#b9d6e7;min-height:18px;margin:12px 0 0;overflow-wrap:anywhere';
 const render=()=>{const l=labels[document.documentElement.lang?.slice(0,2)]||labels.en;
  heading.textContent=l[0];input.placeholder=l[1];input.setAttribute('aria-label',l[1]);button.textContent=l[2];};
 const projectSelect=document.createElement('select');
 projectSelect.setAttribute('aria-label','Saved XSUS App projects');
 projectSelect.style.cssText='display:block;width:100%;box-sizing:border-box;margin-bottom:10px;padding:12px;background:#0b192c;color:#fff;border:1px solid #365778;border-radius:10px';
 const chooseText={sq:'Zgjidh projektin e ruajtur',en:'Select saved project',fr:'Choisir un projet enregistré'};
 const choose=()=>{const lang=document.documentElement.lang?.slice(0,2);return chooseText[lang]||chooseText.en;};
 const emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent=choose();projectSelect.append(emptyOption);
 projectSelect.addEventListener('change',()=>{if(projectSelect.value)input.value=projectSelect.value;});
 input.placeholder='UUID (optional if selected above)';
 const loadProjects=async()=>{
  projectSelect.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=choose();projectSelect.append(placeholder);
  try{
   const client=await getSupabaseClient();
   const {data:sessionData}=await client.auth.getSession();
   const ownerId=sessionData?.session?.user?.id;
   if(!ownerId){status.textContent=(labels[document.documentElement.lang?.slice(0,2)]||labels.en)[3];return;}
   const {data,error}=await client.from('xsus_builder_projects').select('id,name').eq('owner_id',ownerId).order('created_at',{ascending:false}).limit(50);
   if(error)throw error;
   for(const project of data||[]){
    if(!uuid.test(project.id))continue;
    const option=document.createElement('option');option.value=project.id;option.textContent=String(project.name||'Project').slice(0,120);
    projectSelect.append(option);
   }
   if(!data?.length)status.textContent=({sq:'Nuk u gjet projekt i ruajtur në llogarinë tënde.',en:'No saved projects found in your account.',fr:'Aucun projet enregistré dans votre compte.'})[document.documentElement.lang?.slice(0,2)]||'No saved projects found.';
  }catch{status.textContent=(labels[document.documentElement.lang?.slice(0,2)]||labels.en)[7];}
 };
 const description=document.createElement('p');
 description.textContent='XSUS App · Supabase · Secure read-only verification';
 description.style.cssText='font:12px/1.5 system-ui;color:#8da8c5;margin:0 0 18px';
 heading.style.cssText='font:700 18px/1.3 system-ui;margin:0 30px 8px;color:#f1f9ff';
 form.append(projectSelect,input,button);section.append(heading,description,form,status);
 const backdrop=document.createElement('div');
 backdrop.id='xsus-review-backdrop';
 backdrop.style.cssText='position:fixed;inset:0;background:rgba(2,8,20,.7);z-index:2147482998;display:none';
 section.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147482999;display:none;box-sizing:border-box;width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;padding:24px;border:1px solid #345b7a;border-radius:18px;background:#101e33;color:#e6faff;box-shadow:0 22px 70px #000b';
 const launcher=document.createElement('button');
 launcher.type='button';launcher.id='xsus-project-review-open';
 launcher.setAttribute('aria-controls',section.id);
 launcher.setAttribute('aria-expanded','false');
 launcher.style.cssText='position:fixed;right:14px;bottom:78px;z-index:2147482997;display:none;align-items:center;gap:8px;padding:10px 13px;border:1px solid #397c98;border-radius:999px;background:#122a40;color:#e9faff;font:600 12px system-ui;box-shadow:0 6px 24px #0008;cursor:pointer';
 launcher.textContent='✓ Project Review';
 const close=document.createElement('button');
 close.type='button';close.textContent='×';close.setAttribute('aria-label','Close project review');
 close.style.cssText='position:absolute;right:14px;top:10px;background:transparent;color:#cde4f3;border:0;font-size:26px;cursor:pointer';
 section.prepend(close);
 let open=false;
 const toggle=(show)=>{open=show;section.style.display=show?'block':'none';backdrop.style.display=show?'block':'none';launcher.setAttribute('aria-expanded',String(show));if(show){projectSelect.focus();void loadProjects();}else launcher.focus();};
 launcher.addEventListener('click',()=>toggle(!open));
 close.addEventListener('click',()=>toggle(false));
 backdrop.addEventListener('click',()=>toggle(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open)toggle(false);});
 const workspace=document.getElementById('workspace');
 const refreshLauncher=()=>{launcher.style.display=workspace&&!workspace.classList.contains('hidden')?'inline-flex':'none';if(launcher.style.display==='none'&&open)toggle(false);};
 document.body.append(backdrop,section,launcher);
 refreshLauncher();
 new MutationObserver(refreshLauncher).observe(workspace||document.body,{attributes:true,attributeFilter:['class']});
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
   const blocked={
    sq:'Projekti u gjet, por ndërtuesi i sigurt nuk është aktivizuar ende. Projekti nuk është publikuar.',
    en:'Project found, but the trusted builder is not enabled yet. Nothing was deployed.',
    fr:'Projet trouvé, mais le générateur sécurisé n’est pas encore activé. Aucun déploiement.'
   };
   const lang=document.documentElement.lang?.slice(0,2);
   status.textContent=response.ok&&result.status==='ready-for-review'&&result.deployed===false
    ?l[5]:response.status===409&&result.reason==='BUILD_NOT_AVAILABLE'
    ?(blocked[lang]||blocked.en):l[6];
  }catch{status.textContent=l[7];}
  finally{button.disabled=false;}
 });
}
