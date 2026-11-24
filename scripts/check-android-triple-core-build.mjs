import {createRemoteAndroidOrchestrator} from "../services/src/build-worker/android-remote-orchestrator.js";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
try {
 if(process.env.XSUS_ANDROID_LIVE_PROBE_APPROVED!=="true")throw Error("Explicit live probe approval required");
 const projectId="connectivity-probe";
 let approvals=0;
 const run=createRemoteAndroidOrchestrator({env:{...process.env,XSUS_ANDROID_ORCHESTRATION_ENABLED:"true"},authorize:async binding=>{
  if(binding.projectId!==projectId||!Number.isSafeInteger(binding.revision)||! /^[a-f0-9]{64}$/.test(binding.snapshotDigest)||! /^[a-f0-9]{64}$/.test(binding.buildDigest)||approvals!==0)return false;
  approvals++;return true;
 }});
 const result=await run({project_id:projectId,prompts:["Krijo aplikacion Android për menaxhimin e detyrave"],application_id:"com.xsus.connectivity",display_name:"XSUS Connectivity",min_sdk:26,accept_storage_profile:true});
 if(result.status!=="compiled_pending_verification"||approvals!==1)throw Error("Build not ready");
 const dir=await mkdir("android-live-artifacts",{recursive:false});
 await writeFile(join("android-live-artifacts","connectivity-debug.apk"),result.artifact.bytes,{flag:"wx"});
 await writeFile(join("android-live-artifacts","receipt.json"),JSON.stringify({status:result.status,size:result.artifact.size,sha256:result.artifact.sha256,signatureVerified:false,installationVerified:false},null,2),{flag:"wx"});
 console.log("Triple-core compilation completed; signature and installation verification pending");
}catch{
 console.error("Live triple-core build probe failed");
 process.exitCode=1;
}
