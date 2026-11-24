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
 let generation=0,controller=null,busy=false;
 function labels(){title.textContent=launcher.textContent=tr(0);for(const f of [project,name,pkg,approval])f.caption.textContent=tr(f.index);submit.textContent=tr(5);close.textContent=tr(6);}
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
   submit.disabled=project.control.options.length<2||busy;status.textContent=tr(8);
  }catch{if(current===generation&&panel.open)status.textContent=tr(9);}
 });
 close.addEventListener("click",()=>panel.close());
 panel.addEventListener("close",()=>{generation++;controller?.abort();controller=null;});
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(busy||submit.disabled)return;
  busy=true;submit.disabled=true;const current=generation;controller=new AbortController();status.textContent=tr(10);
  try{const job=await api.submit({projectId:project.control.value,applicationId:pkg.control.value.trim(),displayName:name.control.value.trim(),approved:approval.control.checked},controller.signal);
   if(current!==generation||!panel.open)return;status.textContent=tr(11);panel.dataset.jobId=job.id;panel.dataset.projectId=job.projectId;
  }catch{if(current===generation&&panel.open)status.textContent=tr(12);}
  finally{busy=false;if(current===generation&&panel.open)submit.disabled=false;}
 });
}
