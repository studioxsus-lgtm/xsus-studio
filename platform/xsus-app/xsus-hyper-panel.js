import {fetchXsusHyperAssurance} from "./xsus-hyper-client.js";

/**
 * XSUS App Hyper status panel.
 * Authentication is injected by a trusted session integration, never read
 * from localStorage, URL parameters, or an unverified JWT payload.
 */
export function createXsusHyperPanel({
 root, getAccessToken, fetchAssurance=fetchXsusHyperAssurance
}={}){
 if(!root||typeof root.querySelector!=="function"||
    typeof getAccessToken!=="function"||typeof fetchAssurance!=="function")
  throw new TypeError("Panel, authenticated token provider and transport required.");
 const button=root.querySelector("[data-hyper-check]");
 const status=root.querySelector("[data-hyper-status]");
 const details=root.querySelector("[data-hyper-details]");
 if(!button||!status||!details)throw new TypeError("Hyper status panel is incomplete.");
 let busy=false;
 let disposed=false;
 function show(message,detail=""){
  if(disposed)return;
  status.textContent=message;
  details.textContent=detail;
 }
 async function refresh(){
  if(busy||disposed)return;
  busy=true;
  button.disabled=true;
  show("Checking authenticated Hyper XSUS Core status...");
  try{
   const token=await getAccessToken();
   if(typeof token!=="string"||!token.trim()){
    show("Sign in required","A verified session is needed to check Hyper XSUS Core.");
    return;
   }
   const report=await fetchAssurance({token});
   if(report.safeToResume===true&&report.consistent===true){
    show("Hyper XSUS Core: verified","Read-only assurance completed.");
   }else{
    show("Hyper XSUS Core: manual review required",
      "Recovery assurance did not pass. No recovery action was performed.");
   }
  }catch{
   show("Hyper XSUS Core: unavailable",
     "The authenticated verification service could not be reached.");
  }finally{
   busy=false;
   if(!disposed)button.disabled=false;
  }
 }
 button.addEventListener("click",refresh);
 show("Not checked","Sign in, then select Check security status.");
 return Object.freeze({
  refresh,
  dispose(){disposed=true;button.removeEventListener("click",refresh);button.disabled=true;}
 });
}
