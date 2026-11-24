import {createRemoteAndroidOrchestrator} from "../services/src/build-worker/android-remote-orchestrator.js";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
try {
 if(process.env.XSUS_ANDROID_LIVE_PROBE_APPROVED!=="true")throw Error("Explicit live probe approval required");
 const projectId="connectivity-probe";
 let approvals=0;
 const stages=new Map([[process.env.XSUS_ANDROID_PLANNING_URL,'planning'],[process.env.XSUS_ANDROID_REVIEW_URL,'review'],[process.env.XSUS_ANDROID_BUILD_URL,'build']]);
 const fetchImpl=async (url,options)=>{const stage=stages.get(String(url))??'unknown';console.log('Starting '+stage);try{const response=await fetch(url,options);console.log(stage+' HTTP '+response.status);return response;}catch{console.error(stage+' transport failed');throw Error('Transport failed');}};
 const run=createRemoteAndroidOrchestrator({env:{...process.env,XSUS_ANDROID_ORCHESTRATION_ENABLED:"true"},fetchImpl,authorize:async binding=>{
  if(binding.projectId!==projectId||!Number.isSafeInteger(binding.revision)||! /^[a-f0-9]{64}$/.test(binding.snapshotDigest)||! /^[a-f0-9]{64}$/.test(binding.buildDigest)||approvals!==0)return false;
  approvals++;console.log('Build authorization accepted');return true;
 }});
 const result=await run({project_id:projectId,prompts:["Krijo aplikacion Android me menaxhim detyrash"],application_id:"com.xsus.connectivity",display_name:"XSUS Connectivity",min_sdk:26,accept_storage_profile:true});
 console.log('Orchestration status: '+(['compiled_pending_verification','review_required','authorization_required'].includes(result.status)?result.status:'unexpected'));
 if(result.status!=="compiled_pending_verification"||approvals!==1)throw Error("Build not ready");
 const dir=await mkdir("android-live-artifacts",{recursive:false});
 await writeFile(join("android-live-artifacts","connectivity-debug.apk"),result.artifact.bytes,{flag:"wx"});
 await writeFile(join("android-live-artifacts","receipt.json"),JSON.stringify({status:result.status,size:result.artifact.size,sha256:result.artifact.sha256,signatureVerified:false,installationVerified:false},null,2),{flag:"wx"});
 console.log("Triple-core compilation completed; signature and installation verification pending");
}catch{
 console.error("Live triple-core build probe failed");
 process.exitCode=1;
}
