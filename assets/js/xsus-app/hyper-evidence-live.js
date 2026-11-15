/** XSUS App Builder → Tests: authenticated, read-only Hyper evidence verification. */
import { verifyXsusHyperEvidence } from "../../../platform/xsus-app/xsus-hyper-evidence-client.js";
const form=document.getElementById("xsus-hyper-live-form");
const status=document.getElementById("xsus-hyper-live-status");
const submit=document.getElementById("xsus-hyper-live-submit");
const input=document.getElementById("xsus-hyper-live-id");

const liveResult=document.getElementById("xsus-hyper-live-result");
const liveTitle=document.getElementById("xsus-hyper-live-result-title");
const liveId=document.getElementById("xsus-hyper-live-result-id");
const liveDetail=document.getElementById("xsus-hyper-live-result-detail");
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

function showLiveResult(verified,observationId){
 if(!liveResult)return;
 const lang=document.documentElement.lang?.slice(0,2);
 const labels={
  sq:verified?["Evidencë e verifikuar","Konfirmuar nga serveri me autentikim."]:["Verifikimi nuk u konfirmua","Kontrollo ID-në, pronësinë dhe serverin."],
  en:verified?["Evidence verified","Authenticated verification confirmed by backend."]:["Verification not confirmed","Check ID, ownership and backend."],
  fr:verified?["Preuve vérifiée","Vérification authentifiée confirmée par le serveur."]:["Vérification non confirmée","Vérifiez l’identifiant, les droits et le serveur."]
 };
 const [title,detail]=labels[lang]||labels.en;
 liveTitle.textContent=title;
 liveId.textContent=(lang==="fr"?"Identifiant d’observation":lang==="sq"?"ID e vëzhgimit":"Observation ID")+": "+observationId;
 liveDetail.textContent=detail;
 liveResult.hidden=false;
}
const SUPABASE_URL="https://rdcwqjsmzklktfccebfs.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const RENDER_ENDPOINT="https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify";
const messages={
 en:{working:"Verifying existing evidence…",success:"Evidence verified successfully.",missing:"Please sign in to XSUS Studio first.",ready:"Signed in. Enter an Observation ID to verify your evidence.",edited:"Observation ID changed. Verify again to see the result for this ID.",failed:"Verification failed. Check the observation ID, ownership and backend status."},
 sq:{working:"Po verifikohet evidenca ekzistuese…",success:"Evidenca u verifikua me sukses.",missing:"Identifikohu fillimisht në XSUS Studio.",ready:"Je i identifikuar. Vendos ID-në e vëzhgimit për verifikim.",edited:"ID-ja e vëzhgimit ndryshoi. Verifiko përsëri për të parë rezultatin e kësaj ID-je.",failed:"Verifikimi dështoi. Kontrollo ID-në, pronësinë dhe serverin."},
 fr:{working:"Vérification de la preuve existante…",success:"Preuve vérifiée avec succès.",missing:"Connectez-vous d’abord à XSUS Studio.",ready:"Vous êtes connecté. Saisissez un identifiant d’observation pour vérifier votre preuve.",edited:"L’identifiant d’observation a changé. Vérifiez à nouveau pour afficher le résultat correspondant.",failed:"Échec de vérification. Vérifiez l’identifiant, le propriétaire et le serveur."}
};
const t=()=>messages[document.documentElement.lang?.slice(0,2)]||messages.en;
let lastState="missing";
let lastObservationId="";
let lastVerified=false;
input?.addEventListener("input",()=>{
 // A previous server verification must never be presented for an edited ID.
 if(liveResult)liveResult.hidden=true;
 lastVerified=false;
 lastObservationId="";
 if(lastState==="success"||lastState==="failed"||lastState==="edited")setState("edited");
});
function setState(state){
 lastState=state;
 if(status)status.textContent=t()[state]||t().failed;
}
function refreshLanguage(){
 if(status)status.textContent=t()[lastState]||t().failed;
 if(liveResult&&!liveResult.hidden)showLiveResult(lastVerified,lastObservationId);
}
document.addEventListener("xsus:language-changed",()=>{applyEvidenceLabels();refreshLanguage();});
applyEvidenceLabels();

let clientPromise;
function getClient(){
 if(!clientPromise) clientPromise=import("https://esm.sh/@supabase/supabase-js@2").then(({createClient})=>createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
 return clientPromise;
}
async function updateSignInStatus(){
 if(!status||submit?.disabled)return;
 try{
  const client=await getClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id){setState("missing");return;}
  setState("ready");
 }catch{setState("failed");}
}
if(form){
 updateSignInStatus();
 window.addEventListener("focus",updateSignInStatus);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateSignInStatus();});
}

form?.addEventListener("submit",async event=>{
 event.preventDefault();
 if(!form.reportValidity()||submit.disabled)return;
 submit.disabled=true;
 if(liveResult)liveResult.hidden=true;
 setState("working");
 try{
  if(!["https://www.xsusstudio.com","https://xsusstudio.com"].includes(location.origin))
   throw new Error("Open XSUS App on its official HTTPS domain.");
  const supabase=await getClient();
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token){status.textContent=t().missing;return;}
  const result=await verifyXsusHyperEvidence({
    observationId:input.value.trim(),
    accessToken:session.access_token,
    endpoint:RENDER_ENDPOINT
  });
  const verified=result.ok===true&&result.verified===true;
  setState(verified?"success":"failed");
  lastVerified=verified;
  lastObservationId=input.value.trim();
  showLiveResult(verified,lastObservationId);
 }catch(error){
  // Do not log tokens or expose internal evidence payloads in the UI.
  setState("failed");
  lastVerified=false;
  lastObservationId=input.value.trim();
  showLiveResult(false,lastObservationId);
 }finally{submit.disabled=false;}
});
