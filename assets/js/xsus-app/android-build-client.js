// Isolated Android staging client. Never exposes server-to-server credentials.
import {getUserAccessToken} from "./auth-session.js";
const STAGING_BASE="https://xsus-app-build-api-staging.onrender.com/api/android";
const PRODUCTION_BASE="https://xsus-app-deployment-api.onrender.com/api/android";
export function resolveAndroidBuildBase(origin){
 if(origin==="https://xsus-app-build-preview-staging.onrender.com")return STAGING_BASE;
 if(["https://www.xsusstudio.com","https://xsusstudio.com"].includes(origin))return PRODUCTION_BASE;
 throw Error("origin_not_allowed");
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createAndroidBuildClient({getToken=getUserAccessToken,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin}={}){
 async function request(path,options={}){
  const token=await getToken();
  if(!token)throw Error("authentication_required");
  const response=await fetchImpl(resolveAndroidBuildBase(origin)+path,{method:options.method??"GET",mode:"cors",cache:"no-store",redirect:"error",headers:{authorization:"Bearer "+token,...(options.body?{"content-type":"application/json"}:{})},body:options.body,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(({401:"authentication_required",403:"origin_not_allowed",404:"not_found",422:"invalid_saved_project",429:"build_capacity_unavailable",503:"android_build_unavailable"})[response.status]??"android_request_failed");
  return response;
 }
 return Object.freeze({
  async submit({projectId,applicationId,displayName,approved},signal){
   if(!UUID.test(projectId??"")||approved!==true||typeof applicationId!=="string"||applicationId.length>150||! /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId)||typeof displayName!=="string"||!displayName.trim()||displayName.length>80)throw Error("invalid_request");
   const response=await request("/jobs",{method:"POST",body:JSON.stringify({projectId,applicationId,displayName,approved:true}),signal});
   const result=await response.json();
   if(response.status!==202||!UUID.test(result?.id??"")||result.projectId!==projectId||result.status!=="queued")throw Error("invalid_response");
   return result;
  },
  async download(artifact,signal){
   if(artifact?.status!=="verified_debug_apk"||artifact.signatureVerified!==true||!UUID.test(artifact.artifactId??"")||!Number.isSafeInteger(artifact.expiresAt)||artifact.expiresAt<=Date.now()||!Number.isSafeInteger(artifact.size)||artifact.size<4||artifact.size>64*1024*1024||! /^[a-f0-9]{64}$/.test(artifact.sha256??""))throw Error("invalid_artifact");
   const response=await request("/artifacts/"+artifact.artifactId+"/download",{signal});
   if(response.headers.get("content-type")!=="application/vnd.android.package-archive"||response.headers.get("x-xsus-sha256")!==artifact.sha256||!response.body){await response.body?.cancel();throw Error("invalid_artifact");}
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>artifact.size){await reader.cancel();throw Error("invalid_artifact");}chunks.push(value);}}finally{reader.releaseLock();}
   if(size!==artifact.size)throw Error("invalid_artifact");
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   if(bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)throw Error("invalid_artifact");
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
   if(digest!==artifact.sha256||signal?.aborted)throw Error("invalid_artifact");
   return new Blob([bytes],{type:"application/vnd.android.package-archive"});
  },
  async status(id,projectId,signal){
   if(!UUID.test(id??"")||!UUID.test(projectId??""))throw Error("invalid_request");
   const result=await (await request("/jobs/"+id,{signal})).json();
   if(result?.id!==id||result.projectId!==projectId||!["queued","building","verifying","verified_debug_apk","failed","review_required","authorization_required","compiled_pending_verification"].includes(result.status))throw Error("invalid_response");
   if(result.status==="verified_debug_apk"&&(!UUID.test(result.artifactId??"")||result.signatureVerified!==true||! /^[a-f0-9]{64}$/.test(result.sha256??"")||!Number.isSafeInteger(result.size)||result.size<4||result.size>64*1024*1024||!Number.isSafeInteger(result.expiresAt)))throw Error("invalid_response");
   return result;
  }
 });
}
