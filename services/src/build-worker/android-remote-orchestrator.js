import {createHash} from "node:crypto";
import {createCoreTransport} from "./android-core-transport.js";
import {orchestrateAndroidBuild} from "./android-triple-core-orchestrator.js";
export function createRemoteAndroidCompiler({endpoint,token,fetchImpl=globalThis.fetch,timeoutMs=660000}={}){
 const url=new URL(endpoint);
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||typeof token!=="string"||!/^[A-Za-z0-9._~-]{32,256}$/.test(token)||!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000)throw Error("Invalid worker configuration");
 return async (input,options)=>{
  if(!["single_screen","bottom_bar"].includes(options.navigation))throw Error("Unsupported navigation");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url.href,{method:"POST",redirect:"error",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({...input,...(options.profile==="restaurant_orders"?{profile:options.profile}:{}),minSdk:options.minSdk,theme:options.theme,primarySeed:options.primarySeed,...(options.navigation==="bottom_bar"?{navigation:"bottom_bar"}:{})})});
   console.info("[android-remote] worker_http",response.status);
   const digest=response.headers.get("x-xsus-sha256");
   if(!response.ok||response.headers.get("content-type")!=="application/octet-stream"||response.headers.get("x-xsus-artifact-status")!=="compiled_pending_verification"||!/^[a-f0-9]{64}$/.test(digest??"")||!response.body){await response.body?.cancel();throw Error("Invalid worker response");}
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>128*1024*1024){await reader.cancel();throw Error("Artifact too large");}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
   const bytes=Buffer.concat(chunks);
   if(size<4||bytes.subarray(0,4).toString("hex")!=="504b0304"||createHash("sha256").update(bytes).digest("hex")!==digest)throw Error("Artifact integrity failure");
   return {kind:"apk",variant:"debug",bytes,size,sha256:digest,signatureVerified:false,installationVerified:false,...(response.headers.get('x-xsus-worker-verification')==='signature-package-launcher'?{workerVerification:{applicationId:input.applicationId,sha256:digest,signatureVerified:true,applicationIdVerified:true,launcherVerified:true}}:{})};
  }finally{clearTimeout(timer);}
 };
}
export function createRemoteAndroidOrchestrator({env=process.env,authorize,fetchImpl=globalThis.fetch}={}){
 if(env.XSUS_ANDROID_ORCHESTRATION_ENABLED!=="true")return null;
 if(typeof authorize!=="function")throw Error("Trusted authorization required");
 const planning=createCoreTransport({endpoint:env.XSUS_ANDROID_PLANNING_URL,token:env.XSUS_ANDROID_PLANNING_TOKEN,fetchImpl});
 const reviewTransport=createCoreTransport({endpoint:env.XSUS_ANDROID_REVIEW_URL,token:env.XSUS_ANDROID_REVIEW_TOKEN,fetchImpl});
 const compiler=createRemoteAndroidCompiler({endpoint:env.XSUS_ANDROID_BUILD_URL,token:env.XSUS_ANDROID_BUILD_TOKEN,fetchImpl});
 return async input=>{
  console.info("[android-remote] planning_started");
  const draft=await planning(input);
  console.info("[android-remote] planning_completed");
  if(draft.execution_authorized!==false)throw Error("Invalid planning authorization");
  if(draft.status!=="draft_ready")return {status:"review_required",issues:["planning_not_ready"]};
  if(draft.plan?.functional?.ui?.android?.project_id!==input.project_id)throw Error("Project mismatch");
  return orchestrateAndroidBuild(input,{planProject:async()=>draft,reviewTransport:async (...args)=>{console.info("[android-remote] review_started");const result=await reviewTransport(...args);console.info("[android-remote] review_completed");return result;},authorize,compiler:async (...args)=>{console.info("[android-remote] compiler_started");const result=await compiler(...args);console.info("[android-remote] compiler_completed");return result;}});
 };
}


