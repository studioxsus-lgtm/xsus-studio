import {getSupabaseClient} from "./auth-session.js";
import {createAndroidBuildClient} from "./android-build-client.js";
const staging="https://xsus-app-build-preview-staging.onrender.com";
if(location.origin===staging){
 const dictionary={
 en:["Android Builder","Choose saved project","Application name","Android package ID","I approve a debug APK build","Generate APK","Close","Loading projects…","Choose a saved project.","Sign in or check your connection.","Submitting build…","Build accepted. Status tracking will follow.","Build unavailable."],
 sq:["Ndërtuesi Android","Zgjidh projektin e ruajtur","Emri i aplikacionit","Identifikuesi Android","Autorizoj kompilimin e APK-së debug","Gjenero APK","Mbyll","Duke ngarkuar projektet…","Zgjidh një projekt të ruajtur.","Identifikohu ose kontrollo lidhjen.","Duke dërguar kërkesën…","Kompilimi u pranua. Ndjekja e statusit do të shtohet.","Kompilimi nuk është i disponueshëm."],
 fr:["Constructeur Android","Choisir un projet enregistré","Nom de l’application","Identifiant Android","J’autorise la compilation APK debug","Générer APK","Fermer","Chargement des projets…","Choisissez un projet enregistré.","Connectez-vous ou vérifiez votre connexion.","Envoi de la demande…","Compilation acceptée. Le suivi sera ajouté.","Compilation indisponible."]
 };
 const tr=i=>(dictionary[document.documentElement.lang?.slice(0,2)]??dictionary.en)[i];
 const api=createAndroidBuildClient();
 const make=(tag,parent)=>{const node=document.createElement(tag);parent.append(node);return node;};
 const panel=make("dialog",document.body);panel.id="xsus-android-builder";panel.className="xsus-android-panel";
 const title=make("h2",panel);title.id="xsus-android-title";panel.setAttribute("aria-labelledby",title.id);
 const form=make("form",panel);
 function field(tag,index){const label=make("label",form),caption=make("span",label),control=make(tag,label);control.required=true;return {caption,control,index};}
 const project=field("select",1),name=field("input",2),pkg=field("input",3),approval=field("input",4);
 name.control.maxLength=80;pkg.control.maxLength=150;pkg.control.placeholder="com.xsus.myapp";pkg.control.autocomplete="off";approval.control.type="checkbox";
 const submit=make("button",form);submit.type="submit";submit.disabled=true;
 const close=make("button",panel);close.type="button";
 const status=make("p",panel);status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const launcher=make("button",document.body);launcher.type="button";launcher.className="xsus-android-launcher";
 let generation=0,controller=null,busy=false,activeJob=null,readyArtifact=null;
 const states={
 queued:["Queued","Në pritje","En attente"],
 building:["Building Android APK…","Duke kompiluar APK-në…","Compilation APK…"],
 verifying:["Verifying and storing APK…","Duke verifikuar dhe ruajtur APK-në…","Vérification et stockage…"],
 verified_debug_apk:["Verified debug APK ready","APK debug e verifikuar, gati","APK debug vérifié, prêt"],
 failed:["Build failed","Kompilimi dështoi","Compilation échouée"],
 review_required:["Project review required","Kërkohet rishikimi i projektit","Révision du projet requise"],
 authorization_required:["Authorization required","Kërkohet autorizim","Autorisation requise"],
 compiled_pending_verification:["Compiled but not verified","Kompiluar, por e paverifikuar","Compilé mais non vérifié"],
 interrupted:["Tracking interrupted. Reopen to retry.","Ndjekja u ndërpre. Rihape panelin.","Suivi interrompu. Rouvrez le panneau."]
 };
 const stateText=key=>states[key]?.[({en:0,sq:1,fr:2})[document.documentElement.lang?.slice(0,2)]??0]??tr(12);
 const download=make("button",panel);download.type="button";download.hidden=true;
 let downloading=false;
 const downloadText=(en,sq,fr)=>({en,sq,fr})[document.documentElement.lang?.slice(0,2)]??en;
 function syncDownload(){download.textContent=downloadText("Download APK","Shkarko APK","Télécharger APK");download.hidden=!readyArtifact;download.disabled=downloading||!readyArtifact||readyArtifact.expiresAt<=Date.now();}
 download.addEventListener("click",async()=>{
  if(download.disabled||!readyArtifact||downloading)return;
  const artifact=readyArtifact,current=generation;downloading=true;syncDownload();
  const abort=new AbortController();controller=abort;
  try{
   const blob=await api.download(artifact,abort.signal);
   if(current!==generation||!panel.open||abort.signal.aborted)return;
   const url=URL.createObjectURL(blob),anchor=document.createElement("a");
   anchor.href=url;anchor.download="xsus-app-debug.apk";document.body.append(anchor);
   try{anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   status.textContent=downloadText("APK download requested.","Shkarkimi i APK-së u kërkua.","Téléchargement APK demandé.");
  }catch{if(current===generation&&panel.open)status.textContent=downloadText("Download failed or expired.","Shkarkimi dështoi ose ka skaduar.","Téléchargement échoué ou expiré.");}
  finally{downloading=false;syncDownload();}
 });
 const progress=make("progress",panel);progress.hidden=true;progress.setAttribute("aria-labelledby",title.id);
 async function track(job,current,signal){
  const deadline=Date.now()+16*60*1000;
  progress.hidden=false;
  try{
   while(Date.now()<deadline&&!signal.aborted&&current===generation&&panel.open){
    const result=await api.status(job.id,job.projectId,signal);
    if(signal.aborted||current!==generation||!panel.open)return;
    status.textContent=stateText(result.status);
    if(!["queued","building","verifying"].includes(result.status)){
     activeJob=null;readyArtifact=result.status==="verified_debug_apk"?result:null;syncDownload();return;
    }
    await new Promise(resolve=>setTimeout(resolve,3000));
   }
   if(current===generation&&!signal.aborted)status.textContent=stateText("interrupted");
  }catch{if(current===generation&&!signal.aborted)status.textContent=stateText("interrupted");}
  finally{if(current===generation)progress.hidden=true;}
 }

 function labels(){title.textContent=launcher.textContent=tr(0);for(const f of [project,name,pkg,approval])f.caption.textContent=tr(f.index);submit.textContent=tr(5);close.textContent=tr(6);syncDownload();}
 function sync(){launcher.hidden=!document.getElementById("workspace")||document.getElementById("workspace").classList.contains("hidden");labels();}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 const workspace=document.getElementById("workspace");if(workspace)new MutationObserver(sync).observe(workspace,{attributes:true,attributeFilter:["class"]});
 sync();
 launcher.addEventListener("click",async()=>{
  const current=++generation;labels();panel.showModal();form.reset();project.control.replaceChildren(new Option(tr(1),""));submit.disabled=true;status.textContent=tr(7);
  try{const client=await getSupabaseClient();const {data,error}=await client.auth.getUser();if(error||!data?.user?.id)throw Error();
   const result=await client.from("xsus_builder_projects").select("id,name").eq("owner_id",data.user.id).order("created_at",{ascending:false}).limit(50);
   if(current!==generation||!panel.open)return;if(result.error)throw Error();
   for(const p of result.data??[])if(typeof p.id==="string")project.control.add(new Option(String(p.name??"Project").slice(0,100),p.id));
   submit.disabled=project.control.options.length<2||busy||!!activeJob;status.textContent=tr(8);
   if(activeJob){controller=new AbortController();await track(activeJob,current,controller.signal);if(current===generation)submit.disabled=!!activeJob||busy||project.control.options.length<2;}
   else if(readyArtifact)status.textContent=stateText("verified_debug_apk");
  }catch{if(current===generation&&panel.open)status.textContent=tr(9);}
 });
 close.addEventListener("click",()=>panel.close());
 panel.addEventListener("close",()=>{generation++;controller?.abort();controller=null;progress.hidden=true;});
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(busy||submit.disabled||activeJob||downloading)return;
  busy=true;readyArtifact=null;syncDownload();submit.disabled=true;const current=generation;controller=new AbortController();status.textContent=tr(10);
  try{const job=await api.submit({projectId:project.control.value,applicationId:pkg.control.value.trim(),displayName:name.control.value.trim(),approved:approval.control.checked},controller.signal);
   activeJob=job;
   if(current!==generation||!panel.open)return;
   await track(job,current,controller.signal);
  }catch{if(current===generation&&panel.open)status.textContent=tr(12);}
  finally{busy=false;if(current===generation&&panel.open)submit.disabled=!!activeJob||project.control.options.length<2;}
 });
}
