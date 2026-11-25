import {randomUUID,createHash} from "node:crypto";
import {createRemoteAndroidOrchestrator} from "../build-worker/android-remote-orchestrator.js";

// Staging-only bounded asynchronous queue. No public route or persistent storage.
export function createAndroidBuildJobs({env=process.env,orchestratorFactory=createRemoteAndroidOrchestrator,now=Date.now,store=null}={}){
 if(env.XSUS_ANDROID_ORCHESTRATION_ENABLED!=="true")return null;
 const jobs=new Map(),ttl=15*60*1000;
 let active=false;
 function prune(){for(const [id,j] of jobs)if(j.finishedAt!==undefined&&now()-j.finishedAt>=ttl)jobs.delete(id);}
 function owned(owner,id){prune();const j=jobs.get(id);return j?.owner===owner?j:null;}
 function status(j){return {id:j.id,projectId:j.projectId,status:j.status,...(j.receipt?{artifactId:j.receipt.id,size:j.receipt.size,sha256:j.receipt.sha256,expiresAt:j.receipt.expiresAt,signatureVerified:true,installationVerified:false}:{}),...(j.artifact?{size:j.artifact.size,sha256:j.artifact.sha256,signatureVerified:false,installationVerified:false}:{})};}
 return Object.freeze({
  // Only a trusted caller that has checked authentication and project ownership may submit.
  submit({owner,projectId,goal,applicationId,displayName,approved}={}){
   prune();
   if(typeof owner!=="string"||!owner||typeof projectId!=="string"||!projectId||typeof goal!=="string"||!goal.trim()||goal.length>2000||typeof applicationId!=="string"||! /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId)||applicationId.length>150||typeof displayName!=="string"||!displayName.trim()||displayName.length>80||/[\x00-\x1f\x7f]/.test(displayName)||approved!==true)throw Error("Invalid approved build request");
   if(active)throw Error("Build capacity unavailable");
   // Retain bounded status history without blocking on completed requests.
   if(jobs.size>=32)throw Error("Build capacity unavailable");
   const id=randomUUID(),j={id,owner,projectId,status:"queued"};
   let authorized=false;
   const run=orchestratorFactory({env,authorize:async b=>{
    if(authorized||b?.projectId!==projectId||!Number.isSafeInteger(b.revision)||b.revision<0||! /^[a-f0-9]{64}$/.test(b.snapshotDigest)||! /^[a-f0-9]{64}$/.test(b.buildDigest))return false;
    authorized=true;return true;
   }});
   if(typeof run!=="function")throw Error("Build unavailable");
   jobs.set(id,j);active=true;
   void Promise.resolve().then(async()=>{
    j.status="building";console.info("[android-job] building");
    const result=await run({project_id:projectId,prompts:[goal],application_id:applicationId,display_name:displayName,min_sdk:26,accept_storage_profile:true});
    if(result?.status==="review_required"||result?.status==="authorization_required"){j.status=result.status;console.info("[android-job] blocked",result.status,Array.isArray(result.issues)?result.issues.slice(0,10).map(issue=>typeof issue==="string"&&/^[a-z_]{1,80}$/.test(issue)?issue:"unspecified_issue"):[]);return;}
    const a=result?.artifact;
    if(!authorized||result?.status!=="compiled_pending_verification"||!Buffer.isBuffer(a?.bytes)||a.bytes.length<4||a.bytes.length>128*1024*1024||a.bytes.subarray(0,4).toString("hex")!=="504b0304"||a.size!==a.bytes.length||a.sha256!==createHash("sha256").update(a.bytes).digest("hex"))throw Error("Invalid artifact");
    if(store){
     const v=a.workerVerification;
     if(v?.applicationId!==applicationId||v.sha256!==a.sha256||v.signatureVerified!==true||v.applicationIdVerified!==true||v.launcherVerified!==true)throw Error("Worker verification required");
     j.status="verifying";console.info("[android-job] storing_verified_artifact");
     j.receipt=await store.put(owner,projectId,{...a,status:"verified_debug_apk",signatureVerified:true,applicationIdVerified:true,launcherVerified:true});
     j.status="verified_debug_apk";return;
    }
    j.artifact={bytes:Buffer.from(a.bytes),size:a.size,sha256:a.sha256};j.status="compiled_pending_verification";
   }).catch(()=>{console.warn("[android-job] failed",j.status);j.status="failed";}).finally(()=>{j.finishedAt=now();active=false;});
   return status(j);
  },
  get(owner,id){const j=owned(owner,id);return j?status(j):null;}
 });
}
