/** XSUS App Builder → Tests: authenticated, read-only Hyper evidence verification. */
// Load the backend transport only when needed, so UI and localization remain available if it fails to load.
const form=document.getElementById("xsus-hyper-live-form");
const status=document.getElementById("xsus-hyper-live-status");
const submit=document.getElementById("xsus-hyper-live-submit");
const input=document.getElementById("xsus-hyper-live-id");

const liveResult=document.getElementById("xsus-hyper-live-result");
const liveTitle=document.getElementById("xsus-hyper-live-result-title");
const liveId=document.getElementById("xsus-hyper-live-result-id");
const liveDetail=document.getElementById("xsus-hyper-live-result-detail");
const liveMeta=document.createElement("p");
liveMeta.id="xsus-hyper-live-result-meta";
liveMeta.style.cssText="margin:8px 0 0;font-size:12px;opacity:.8;overflow-wrap:anywhere";
liveDetail?.insertAdjacentElement("afterend",liveMeta);
let lastVerifiedAt=null;
const copyButton=document.createElement("button");
copyButton.type="button";
copyButton.style.cssText="margin-top:10px;padding:7px 12px;border:1px solid #36758c;border-radius:7px;background:#123248;color:#e6faff;cursor:pointer";
copyButton.hidden=true;
liveMeta?.insertAdjacentElement("afterend",copyButton);
const copyLabels={
 en:{copy:"Copy Observation ID",copied:"Observation ID copied",failed:"Could not copy ID",time:"Checked on this device"},
 sq:{copy:"Kopjo ID-në e vëzhgimit",copied:"ID-ja u kopjua",failed:"ID-ja nuk u kopjua",time:"Kontrolluar në këtë pajisje"},
 fr:{copy:"Copier l’identifiant d’observation",copied:"Identifiant copié",failed:"Impossible de copier l’identifiant",time:"Contrôlé sur cet appareil"}
};
copyButton.addEventListener("click",async()=>{
 if(!lastVerified||!lastObservationId||liveResult?.hidden)return;
 const lang=document.documentElement.lang?.slice(0,2);
 const labels=copyLabels[lang]||copyLabels.en;
 try{
  await navigator.clipboard.writeText(lastObservationId);
  copyButton.textContent=labels.copied;
 }catch{copyButton.textContent=labels.failed;}
});
// Session-only display history: never store credentials or evidence payloads.
const recentChecks=[];
const historyBox=document.createElement("section");
historyBox.id="xsus-hyper-recent-checks";
historyBox.style.cssText="margin-top:12px;padding:12px;border:1px solid #28506b;border-radius:9px;background:#0b182a";
historyBox.hidden=true;
liveResult?.insertAdjacentElement("afterend",historyBox);
const historyLabels={
 sq:{title:"Verifikimet e fundit",clear:"Pastro historikun",checked:"Kontrolluar në këtë pajisje"},
 en:{title:"Recent verifications",clear:"Clear history",checked:"Checked on this device"},
 fr:{title:"Vérifications récentes",clear:"Effacer l’historique",checked:"Contrôlé sur cet appareil"}
};
function renderRecentChecks(){
 const lang=document.documentElement.lang?.slice(0,2);
 const labels=historyLabels[lang]||historyLabels.en;
 historyBox.replaceChildren();
 historyBox.hidden=recentChecks.length===0;
 if(!recentChecks.length)return;
 const heading=document.createElement("strong");
 heading.textContent=labels.title;
 const clear=document.createElement("button");
 clear.type="button";
 clear.textContent=labels.clear;
 clear.style.cssText="float:right;background:transparent;border:1px solid #36758c;border-radius:6px;color:#d7f5ff;padding:4px 8px;cursor:pointer";
 clear.addEventListener("click",()=>{recentChecks.length=0;renderRecentChecks();});
 const list=document.createElement("ol");
 list.style.cssText="padding-left:20px;margin:10px 0 0;overflow-wrap:anywhere";
 const locale=lang==="sq"?"sq-AL":lang==="fr"?"fr-FR":"en-GB";
 for(const check of recentChecks){
  const item=document.createElement("li");
  item.style.marginBottom="7px";
  item.textContent=check.id+" · "+labels.checked+" "+new Intl.DateTimeFormat(locale,{dateStyle:"short",timeStyle:"short"}).format(check.at);
  list.append(item);
 }
 historyBox.append(heading,clear,list);
}
function recordVerifiedCheck(id){
 recentChecks.unshift({id,at:new Date()});
 if(recentChecks.length>5)recentChecks.length=5;
 renderRecentChecks();
}
const uiLabels={
 en:{title:"Hyper Evidence Verification",description:"Authenticated read-only check of evidence you own.",id:"Observation ID",button:"Verify Evidence"},
 fr:{title:"Vérification des preuves Hyper",description:"Vérification authentifiée en lecture seule des preuves qui vous appartiennent.",id:"Identifiant d’observation",button:"Vérifier la preuve"},
 sq:{title:"Verifikimi i evidencës Hyper",description:"Verifikim i autentikuar, vetëm për lexim, i evidencës që zotëron.",id:"ID e vëzhgimit",button:"Verifiko evidencën"}
};
function applyEvidenceLabels(){
 const lang=document.documentElement.lang?.slice(0,2);
 const labels=uiLabels[lang]||uiLabels.en;
 const title=document.getElementById("xsus-hyper-live-title");
 const description=document.querySelector("#xsus-hyper-live > p[data-i18n]");
 const idLabel=document.querySelector('label span[data-i18n="Observation ID"]');
 if(title)title.textContent=labels.title;
 if(description)description.textContent=labels.description;
 if(idLabel)idLabel.textContent=labels.id;
 if(input)input.placeholder=labels.id;
 if(submit)submit.textContent=labels.button;
}

function showLiveResult(verified,observationId,resultState=verified?"success":"failed"){
 if(!liveResult)return;
 const lang=document.documentElement.lang?.slice(0,2);
 const labels={
  sq:verified?["Evidencë e verifikuar","Konfirmuar nga serveri me autentikim."]:["Verifikimi nuk u konfirmua","Kontrollo ID-në, pronësinë dhe serverin."],
  en:verified?["Evidence verified","Authenticated verification confirmed by backend."]:["Verification not confirmed","Check ID, ownership and backend."],
  fr:verified?["Preuve vérifiée","Vérification authentifiée confirmée par le serveur."]:["Vérification non confirmée","Vérifiez l’identifiant, les droits et le serveur."]
 };
 const [title,defaultDetail]=labels[lang]||labels.en;
 const detail=verified?defaultDetail:(messages[lang]||messages.en)[resultState]||defaultDetail;
 liveTitle.textContent=title;
 liveId.textContent=(lang==="fr"?"Identifiant d’observation":lang==="sq"?"ID e vëzhgimit":"Observation ID")+": "+observationId;
 liveDetail.textContent=detail;
 const metaLabels={
  en:{real:"Live backend verification · Not a demo result",time:"Checked at"},
  sq:{real:"Verifikim real nga serveri · Jo rezultat demonstrativ",time:"Kontrolluar më"},
  fr:{real:"Vérification réelle par le serveur · Pas un résultat fictif",time:"Vérifié le"}
 };
 const meta=metaLabels[lang]||metaLabels.en;
 const copyText=copyLabels[lang]||copyLabels.en;
 copyButton.hidden=!verified;
 copyButton.textContent=copyText.copy;
 const locale=lang==="sq"?"sq-AL":lang==="fr"?"fr-FR":"en-GB";
 const checked=lastVerifiedAt?new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"medium"}).format(lastVerifiedAt):"";
 liveMeta.textContent=(verified?meta.real:"")+(checked?(verified?" · ":"")+copyText.time+" "+checked:"");
 liveResult.hidden=false;
}
const SUPABASE_URL="https://rdcwqjsmzklktfccebfs.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const RENDER_ENDPOINT="https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify";
const messages={
 en:{working:"Verifying existing evidence…",success:"Evidence verified successfully.",missing:"Please sign in to XSUS Studio first.",ready:"Signed in. Enter an Observation ID to verify your evidence.",edited:"Observation ID changed. Verify again to see the result for this ID.",failed:"Verification failed. Check the observation ID, ownership and backend status.",invalid:"Use 1–128 characters: letters, numbers, underscore (_) or hyphen (-).",unauthorized:"Your session is invalid or you do not have access to this evidence.",unavailable:"The verification service is temporarily unavailable. Try again later."},
 sq:{working:"Po verifikohet evidenca ekzistuese…",success:"Evidenca u verifikua me sukses.",missing:"Identifikohu fillimisht në XSUS Studio.",ready:"Je i identifikuar. Vendos ID-në e vëzhgimit për verifikim.",edited:"ID-ja e vëzhgimit ndryshoi. Verifiko përsëri për të parë rezultatin e kësaj ID-je.",failed:"Verifikimi dështoi. Kontrollo ID-në, pronësinë dhe serverin.",invalid:"Përdor 1–128 karaktere: shkronja, numra, nënvizë (_) ose vizë (-).",unauthorized:"Sesioni yt është i pavlefshëm ose nuk ke akses në këtë evidencë.",unavailable:"Shërbimi i verifikimit nuk është përkohësisht i disponueshëm. Provo më vonë."},
 fr:{working:"Vérification de la preuve existante…",success:"Preuve vérifiée avec succès.",missing:"Connectez-vous d’abord à XSUS Studio.",ready:"Vous êtes connecté. Saisissez un identifiant d’observation pour vérifier votre preuve.",edited:"L’identifiant d’observation a changé. Vérifiez à nouveau pour afficher le résultat correspondant.",failed:"Échec de vérification. Vérifiez l’identifiant, le propriétaire et le serveur.",invalid:"Utilisez 1 à 128 caractères : lettres, chiffres, tiret bas (_) ou trait d’union (-).",unauthorized:"Votre session est invalide ou vous n’avez pas accès à cette preuve.",unavailable:"Le service de vérification est temporairement indisponible. Réessayez plus tard."}
};
const t=()=>messages[document.documentElement.lang?.slice(0,2)]||messages.en;
let lastState="missing";
let lastObservationId="";
let lastVerified=false;
let lastResultState="failed";
let inputRevision=0;
let requestRevision=0;
input?.addEventListener("input",()=>{
 inputRevision+=1;
 // A previous server verification must never be presented for an edited ID.
 if(liveResult)liveResult.hidden=true;
 copyButton.hidden=true;
 lastVerifiedAt=null;
 lastVerified=false;
 lastObservationId="";
 if(lastState!=="missing")setState("edited");
});
function setState(state){
 lastState=state;
 if(status)status.textContent=t()[state]||t().failed;
}
function refreshLanguage(){
 if(status)status.textContent=t()[lastState]||t().failed;
 if(liveResult&&!liveResult.hidden)showLiveResult(lastVerified,lastObservationId,lastResultState);
}
document.addEventListener("xsus:language-changed",()=>{applyEvidenceLabels();refreshLanguage();renderRecentChecks();});
applyEvidenceLabels();
setState("missing");

let clientPromise;
function getClient(){
 if(!clientPromise) clientPromise=import("https://esm.sh/@supabase/supabase-js@2").then(({createClient})=>createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
 return clientPromise;
}
let authCheckRevision=0;
async function updateSignInStatus(){
 if(!status||submit?.disabled)return;
 const check=++authCheckRevision;
 const startingInputRevision=inputRevision;
 const startingRequestRevision=requestRevision;
 const mayUpdate=()=>check===authCheckRevision&&
  startingInputRevision===inputRevision&&
  startingRequestRevision===requestRevision&&
  !submit?.disabled&&["missing","ready"].includes(lastState);
 try{
  const client=await getClient();
  const {data,error}=await client.auth.getUser();
  if(!mayUpdate())return;
  setState(error||!data?.user?.id?"missing":"ready");
 }catch{
  if(mayUpdate())setState("missing");
 }
}
if(form){
 updateSignInStatus();
 window.addEventListener("focus",updateSignInStatus);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateSignInStatus();});
}

form?.addEventListener("submit",async event=>{
 event.preventDefault();
 if(!form.reportValidity()||submit.disabled)return;
 const requestedId=input.value.trim();
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(requestedId)){
  if(liveResult)liveResult.hidden=true;
  copyButton.hidden=true;
  setState("invalid");
  return;
 }
 submit.disabled=true;
 const requestedRevision=inputRevision;
 const activeRequest=++requestRevision;
 const isCurrent=()=>activeRequest===requestRevision&&requestedRevision===inputRevision&&input.value.trim()===requestedId;
 if(liveResult)liveResult.hidden=true;
 copyButton.hidden=true;
 setState("working");
 try{
  if(!["https://www.xsusstudio.com","https://xsusstudio.com"].includes(location.origin))
   throw new Error("Open XSUS App on its official HTTPS domain.");
  const supabase=await getClient();
  const {data:{session},error}=await supabase.auth.getSession();
  if(!isCurrent())return;
  if(error||!session?.access_token){setState("missing");return;}
  const {verifyXsusHyperEvidence}=await import("../../../platform/xsus-app/xsus-hyper-evidence-client.js");
  const result=await verifyXsusHyperEvidence({
    observationId:requestedId,
    accessToken:session.access_token,
    endpoint:RENDER_ENDPOINT
  });
  if(!isCurrent())return;
  const verified=result.ok===true&&result.verified===true;
  setState(verified?"success":"failed");
  lastVerified=verified;
  lastResultState=verified?"success":"failed";
  lastObservationId=requestedId;
  lastVerifiedAt=new Date();
  if(verified)recordVerifiedCheck(requestedId);
  showLiveResult(verified,lastObservationId);
 }catch(error){
  if(!isCurrent())return;
  // Do not log tokens or expose internal evidence payloads in the UI.
  const reason=error?.message==="Hyper verification authorization failed."?"unauthorized":
   error?.message==="Hyper verification is not enabled or unavailable."?"unavailable":"failed";
  setState(reason);
  lastVerified=false;
  lastResultState=reason;
  lastObservationId=requestedId;
  lastVerifiedAt=new Date();
  showLiveResult(false,lastObservationId,reason);
 }finally{if(activeRequest===requestRevision)submit.disabled=false;}
});
