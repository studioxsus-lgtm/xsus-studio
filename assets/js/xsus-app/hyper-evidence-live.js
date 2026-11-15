/** XSUS App Builder → Tests: authenticated, read-only Hyper evidence verification. */
import { verifyXsusHyperEvidence } from "../../../platform/xsus-app/xsus-hyper-evidence-client.js";
const form=document.getElementById("xsus-hyper-live-form");
const status=document.getElementById("xsus-hyper-live-status");
const submit=document.getElementById("xsus-hyper-live-submit");
const input=document.getElementById("xsus-hyper-live-id");
const SUPABASE_URL="https://rdcwqjsmzklktfccebfs.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_v7Pi4OUbk9JkeqXTIfwQzQ_Mxv9KMkr";
const RENDER_ENDPOINT="https://xsus-studio.onrender.com/api/xsus-app/hyper/evidence/verify";
const messages={
 en:{working:"Verifying existing evidence…",success:"Evidence verified successfully.",missing:"Please sign in to XSUS Studio first.",failed:"Verification failed. Check the observation ID, ownership and backend status."},
 sq:{working:"Po verifikohet evidenca ekzistuese…",success:"Evidenca u verifikua me sukses.",missing:"Identifikohu fillimisht në XSUS Studio.",failed:"Verifikimi dështoi. Kontrollo ID-në, pronësinë dhe serverin."},
 fr:{working:"Vérification de la preuve existante…",success:"Preuve vérifiée avec succès.",missing:"Connectez-vous d’abord à XSUS Studio.",failed:"Échec de vérification. Vérifiez l’identifiant, le propriétaire et le serveur."}
};
const t=()=>messages[document.documentElement.lang?.slice(0,2)]||messages.en;
form?.addEventListener("submit",async event=>{
 event.preventDefault();
 if(!form.reportValidity()||submit.disabled)return;
 submit.disabled=true;
 status.textContent=t().working;
 try{
  if(!["https://www.xsusstudio.com","https://xsusstudio.com"].includes(location.origin))
   throw new Error("Open XSUS App on its official HTTPS domain.");
  const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session?.access_token){status.textContent=t().missing;return;}
  const result=await verifyXsusHyperEvidence({
    observationId:input.value.trim(),
    accessToken:session.access_token,
    endpoint:RENDER_ENDPOINT
  });
  status.textContent=result.ok===true&&result.verified===true?t().success:t().failed;
 }catch(error){
  // Do not log tokens or expose internal evidence payloads in the UI.
  status.textContent=t().failed+" ("+String(error?.message||"Unavailable")+")";
 }finally{submit.disabled=false;}
});
