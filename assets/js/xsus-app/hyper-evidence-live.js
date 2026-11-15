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
 liveId.textContent="Observation ID: "+observationId;
 liveDetail.textContent=detail;
 liveResult.hidden=false;
}
const SUPABASE_URL="https://rdcwqjsmzklktfccebfs.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const RENDER_ENDPOINT="https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify";
const messages={
 en:{working:"Verifying existing evidence…",success:"Evidence verified successfully.",missing:"Please sign in to XSUS Studio first.",failed:"Verification failed. Check the observation ID, ownership and backend status."},
 sq:{working:"Po verifikohet evidenca ekzistuese…",success:"Evidenca u verifikua me sukses.",missing:"Identifikohu fillimisht në XSUS Studio.",failed:"Verifikimi dështoi. Kontrollo ID-në, pronësinë dhe serverin."},
 fr:{working:"Vérification de la preuve existante…",success:"Preuve vérifiée avec succès.",missing:"Connectez-vous d’abord à XSUS Studio.",failed:"Échec de vérification. Vérifiez l’identifiant, le propriétaire et le serveur."}
};
const t=()=>messages[document.documentElement.lang?.slice(0,2)]||messages.en;

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
  if(error||!data?.user?.id){status.textContent=t().missing;return;}
  const messages={en:"Signed in. Enter an Observation ID to verify your evidence.",sq:"Je i identifikuar. Vendos Observation ID për verifikim.",fr:"Vous êtes connecté. Saisissez un Observation ID pour vérifier."};
  status.textContent=messages[document.documentElement.lang?.slice(0,2)]||messages.en;
 }catch{status.textContent=t().failed;}
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
 status.textContent=t().working;
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
  status.textContent=verified?t().success:t().failed;
  showLiveResult(verified,input.value.trim());
 }catch(error){
  // Do not log tokens or expose internal evidence payloads in the UI.
  status.textContent=t().failed;
  showLiveResult(false,input.value.trim());
 }finally{submit.disabled=false;}
});
