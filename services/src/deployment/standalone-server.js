// XSUS App deployment validation service. Separate from XSUS AI Core.
// No provider deployments, no credentials loaded, and no production integrations by default.
import http from 'node:http';
import {createAndroidBuildJobs} from './android-build-jobs.js';
import {createAndroidJobsRoute} from './android-jobs-route.js';
import crypto from 'node:crypto';
import {isPersistedBuilderProjectId} from './project-id-contract.js';
import { pathToFileURL } from 'node:url';
import { createDeploymentNodeHandler } from './deployment-node-adapter.js';
import { createSupabaseProjectReviewIntegration } from './supabase-project-review-integration.js';
import { createSupabaseRestReviewClient } from './supabase-rest-review-client.js';
import { createXsUsAppSavedProjectBuilder } from './xsus-app-build-engine.js';
import { createBuildWorkerConnectivity } from './build-worker-connectivity.js';
import { generateWorkerStaticPreview } from '../build-worker/static-preview-build.js';

import {validReservationSpec} from "../build-worker/reservation-preview.js";

export function createStandaloneDeploymentServer(dependencies={}) {
  const route=createDeploymentNodeHandler(dependencies);
  const androidRoute=createAndroidJobsRoute({jobs:dependencies.androidJobs,createUserClient:dependencies.createUserPreviewClient,allowedOrigins:dependencies.allowedOrigins});
  const workerConnectivity=dependencies.workerConnectivity;
  const connectivityToken=dependencies.connectivityToken;
  return http.createServer((req,res)=>{
    const androidPath=req.url?.split('?')[0];
    if(androidPath==='/api/android/jobs'||androidPath?.startsWith('/api/android/jobs/')){void androidRoute(req,res);return;}
    if (req.url?.split('?')[0]==='/healthz' && req.method==='GET') {
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
      res.end(JSON.stringify({ok:true,service:'xsus-app-deployment-validation',deploymentEnabled:false}));
      return;
    }
    if(req.url?.split('?')[0]==='/internal/build-worker/status'){
      res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
      if(req.method!=='GET'){res.writeHead(405);res.end(JSON.stringify({error:'method_not_allowed'}));return;}
      if(!workerConnectivity||!connectivityToken||req.headers.authorization!=='Bearer '+connectivityToken){res.writeHead(404);res.end(JSON.stringify({error:'not_found'}));return;}
      void workerConnectivity.check().then(result=>{res.writeHead(result.connected?200:503);res.end(JSON.stringify(result));}).catch(()=>{res.writeHead(503);res.end(JSON.stringify({connected:false}));});return;
    }
    if(req.url?.split("?")[0]==="/api/build/from-goal"){
      const origin=req.headers.origin;
      const allowed=typeof origin==="string"&&dependencies.allowedOrigins?.includes(origin);
      const reply=(status,body)=>{if(res.writableEnded)return;res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff",...(allowed?{"access-control-allow-origin":origin,"vary":"Origin"}:{})});res.end(JSON.stringify(body));};
      if(req.method==="OPTIONS"){
        if(!allowed||req.headers["access-control-request-method"]!=="POST"){reply(403,{error:"preflight_denied"});return;}
        res.writeHead(204,{"access-control-allow-origin":origin,"access-control-allow-methods":"POST","access-control-allow-headers":"authorization, content-type","vary":"Origin"});res.end();return;
      }
      if(req.method!=="POST"){reply(405,{error:"method_not_allowed"});return;}
      if(!allowed){reply(403,{error:"origin_not_allowed"});return;}
      if(!dependencies.userPreviewEnabled||typeof dependencies.createUserPreviewClient!=="function"||typeof dependencies.previewProxy!=="function"){reply(503,{error:"build_unavailable"});return;}
      const token=req.headers.authorization;
      if(typeof token!=="string"||token.length<23||token.length>8200||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(token)){reply(401,{error:"authentication_required"});return;}
      if(!/^application\/json(?:\s*;|\s*$)/i.test(String(req.headers["content-type"]??""))){reply(415,{error:"unsupported_media_type"});return;}
      void (async()=>{
        try{
          const chunks=[];let size=0;
          if(Number(req.headers["content-length"]??0)>4096){reply(413,{error:"payload_too_large"});return;}
          for await(const chunk of req){size+=chunk.length;if(size>4096){reply(413,{error:"payload_too_large"});return;}chunks.push(chunk);}
          let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{reply(400,{error:"invalid_json"});return;}
          if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>key!=="goal"&&key!=="appSpec")||(body.appSpec!==undefined&&!validReservationSpec(body.appSpec))||typeof body.goal!=="string"||!body.goal.trim()||body.goal.length>2000){reply(400,{error:"invalid_goal"});return;}
          const client=dependencies.createUserPreviewClient(token.slice(7));
          const verified=await client.auth.getUser(token.slice(7));
          if(verified?.error||!verified?.data?.user?.id){reply(401,{error:"authentication_required"});return;}
          const result=await dependencies.previewProxy({name:body.goal.trim().slice(0,100), ...(body.appSpec && {appSpec:body.appSpec})});
          if(result?.kind!=="static-preview"||result?.requiresReview!==true||!Array.isArray(result.files)||result.files.length!==3||!["index.html","styles.css","main.js"].every(path=>result.files.some(file=>file?.path===path&&typeof file.content==="string"&&file.content.length>0&&file.content.length<=250000))){reply(503,{error:"invalid_build_result"});return;}
          reply(200,{kind:"static-preview",requiresReview:true,files:result.files});
        }catch(error){console.warn("[xsus-goal-build-failure]",JSON.stringify({type:error?.name||"Error"}));reply(503,{error:"build_unavailable"});}
      })();return;
    }
    if(req.url?.split("?")[0]==="/api/projects/build-preview"){
      const origin=req.headers.origin;
      const allowed=typeof origin==="string"&&dependencies.allowedOrigins?.includes(origin);
      const reply=(status,body)=>{if(res.writableEnded)return;res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff",...(allowed?{"access-control-allow-origin":origin,"vary":"Origin"}:{})});res.end(JSON.stringify(body));};
      if(req.method==="OPTIONS"){
        if(!allowed){reply(403,{error:"origin_not_allowed"});return;}
        if(req.headers["access-control-request-method"]!=="POST"||
           String(req.headers["access-control-request-headers"]??"").toLowerCase().split(",").some(h=>h.trim()&&!["authorization","content-type"].includes(h.trim()))){reply(403,{error:"preflight_denied"});return;}
        res.writeHead(204,{"access-control-allow-origin":origin,"access-control-allow-methods":"POST","access-control-allow-headers":"authorization, content-type","access-control-max-age":"300","vary":"Origin"});res.end();return;
      }
      if(req.method!=="POST"){reply(405,{error:"method_not_allowed"});return;}
      if(!allowed){reply(403,{error:"origin_not_allowed"});return;}
      if(!dependencies.userPreviewEnabled||typeof dependencies.createUserPreviewClient!=="function"||typeof dependencies.previewProxy!=="function"){reply(503,{error:"preview_not_configured"});return;}
      const token=req.headers.authorization;
      if(typeof token!=="string"||token.length<23||token.length>8200||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(token)){reply(401,{error:"authentication_required"});return;}
      if(!/^application\/json(?:\s*;|\s*$)/i.test(String(req.headers["content-type"]??""))){reply(415,{error:"unsupported_media_type"});return;}
      void (async()=>{
        try{
          const chunks=[];let size=0;
          const declared=req.headers["content-length"];
          if(declared!==undefined&&(!/^\d+$/.test(String(declared))||!Number.isSafeInteger(Number(declared))||Number(declared)>2048)){reply(413,{error:"payload_too_large"});return;}
          for await(const chunk of req){size+=chunk.length;if(size>2048){reply(413,{error:"payload_too_large"});return;}chunks.push(chunk);}
          let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{reply(400,{error:"invalid_json"});return;}
          if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==1||!isPersistedBuilderProjectId(body.projectId)){reply(400,{error:"invalid_project_id"});return;}
          const client=dependencies.createUserPreviewClient(token.slice(7));
          const verified=await client.auth.getUser(token.slice(7));
          const ownerId=verified?.data?.user?.id;
          if(verified?.error||typeof ownerId!=="string"||!ownerId){reply(401,{error:"authentication_required"});return;}
          const {data,error}=await client.from("xsus_builder_projects").select("id,owner_id,name,snapshot").eq("id",body.projectId).eq("owner_id",ownerId).maybeSingle();
          if(error){console.warn("[xsus-user-preview-failure]",JSON.stringify({stage:"project_lookup",code:typeof error.code==="string"?error.code:"unknown"}));reply(503,{error:"project_unavailable"});return;}
          if(!data||data.id!==body.projectId||data.owner_id!==ownerId){reply(404,{error:"project_not_found"});return;}
          // Older saved projects may have a name but no snapshot.goal. Keep the owner check mandatory.
          const goal=[data.snapshot?.goal,data.name].find(value=>typeof value==="string"&&value.trim().length>0);
          if(!goal){reply(422,{error:"invalid_saved_project"});return;}
          const result=await dependencies.previewProxy({name:goal.trim().slice(0,100)});
          if(result?.kind!=="static-preview"||result?.requiresReview!==true||!Array.isArray(result.files)||result.files.length!==3||new Set(result.files.map(file=>file?.path)).size!==3||!["index.html","styles.css","main.js"].every(path=>result.files.some(file=>file?.path===path&&typeof file.content==="string"&&file.content.length>0&&file.content.length<=250000))){console.warn("[xsus-user-preview-failure]",JSON.stringify({stage:"manifest_validation"}));reply(503,{error:"preview_unavailable"});return;}
          reply(200,{projectId:body.projectId,kind:result.kind,requiresReview:true,files:result.files});
        }catch(error){console.warn("[xsus-user-preview-failure]",JSON.stringify({stage:"preview_proxy",reason:error?.name==="TimeoutError"?"timeout":error?.message==="Invalid preview manifest"?"invalid_worker_manifest":error?.message==="Worker preview failed"?"worker_http_failure":error?.message==="Worker preview network unavailable"?"worker_network_failure":"unexpected_proxy_error"}));reply(503,{error:"preview_unavailable"});}
      })();return;
    }
    if(req.url?.split("?")[0]==="/internal/build-preview"){
      const reply=(status,body)=>{if(res.writableEnded)return;res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body));};
      if(req.method!=="POST"){reply(405,{error:"method_not_allowed"});return;}
      if(!dependencies.previewProxyEnabled||!dependencies.previewProxy||!connectivityToken){reply(404,{error:"not_found"});return;}
      const supplied=req.headers.authorization;
      const expected="Bearer "+connectivityToken;
      if(typeof supplied!=="string"||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
         !crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))){reply(404,{error:"not_found"});return;}
      void (async()=>{
        try{
          const chunks=[];let size=0;
          const len=req.headers["content-length"];
          if(len!==undefined&&(!/^\d+$/.test(String(len))||Number(len)>2048)){reply(413,{error:"payload_too_large"});return;}
          for await(const chunk of req){size+=chunk.length;if(size>2048){reply(413,{error:"payload_too_large"});return;}chunks.push(chunk);}
          let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{reply(400,{error:"invalid_json"});return;}
          if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>k!=="name")||typeof body.name!=="string"||!body.name.trim()||body.name.length>100){reply(400,{error:"invalid_request"});return;}
          const result=await dependencies.previewProxy({name:body.name});
          if(!result||result.kind!=="static-preview"||!Array.isArray(result.files)){reply(503,{error:"preview_unavailable"});return;}
          reply(200,result);
        }catch{reply(503,{error:"preview_unavailable"});}
      })();return;
    }
    void route(req,res);
  });
}

export function startStandaloneDeploymentServer({env=process.env,dependencies={},supabaseClient,buildFromSavedProject}={}) {
  const port=Number(env.PORT??3001);
  if (!Number.isInteger(port)||port<0||port>65535) throw new TypeError('Invalid PORT');
  // A trusted server bootstrap may inject Supabase and a server-only builder.
  // Neither is inferred from browser input or environment secrets.
  const configured= supabaseClient!==undefined || buildFromSavedProject!==undefined;
  const integration=configured
    ? createSupabaseProjectReviewIntegration({supabaseClient,buildFromSavedProject})
    : {};
  const supabaseUrl=env.XSUS_APP_SUPABASE_URL;
  const publishableKey=env.XSUS_APP_SUPABASE_PUBLISHABLE_KEY;
  // A half-configured production connection must fail startup visibly.
  if (Boolean(supabaseUrl)!==Boolean(publishableKey))
    throw new TypeError('Incomplete XSUS App Supabase configuration');
  const restConfigured=Boolean(supabaseUrl&&publishableKey);
  if (restConfigured && (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl) ||
      !publishableKey.startsWith('sb_publishable_')))
    throw new TypeError('Invalid XSUS App Supabase configuration');
  // Read-only connection: no trusted application builder is enabled by default.
  // Authentication and owner-scoped reads work; review remains denied at build preflight.
  const restIntegration=restConfigured ? {
    createProjectReviewer(accessToken) {
      const client=createSupabaseRestReviewClient({url:supabaseUrl,publishableKey,accessToken});
      // Feature flag is OFF by default. A passing scaffold review is not a
      // functional app, production deployment, or an AI-generated application.
      const builder=env.XSUS_APP_ENABLE_SCAFFOLD_REVIEW==='true'
        ?createXsUsAppSavedProjectBuilder(client):async()=>null;
      return createSupabaseProjectReviewIntegration({supabaseClient:client,
        buildFromSavedProject:builder}).projectReviewer;
    }
  } : {};
  const workerConfigured=Boolean(env.XSUS_BUILD_WORKER_URL&&env.XSUS_BUILD_WORKER_SHARED_SECRET&&env.XSUS_BUILD_STATUS_TOKEN);
  const workerConnectivity=workerConfigured?createBuildWorkerConnectivity({workerUrl:env.XSUS_BUILD_WORKER_URL,sharedSecret:env.XSUS_BUILD_WORKER_SHARED_SECRET}):undefined;
  const previewProxyEnabled=workerConfigured&&env.XSUS_BUILD_PREVIEW_PROXY_ENABLED==="true";
  // Staging-only recovery for Render Free worker gateway outages. The same
  // deterministic static generator runs locally; never executes user code.
  const localStaticFallback=env.XSUS_STAGING_STATIC_PREVIEW_FALLBACK==="true"&&env.XSUS_USER_PROJECT_PREVIEW_ENABLED==="true";
  const fallbackPreview=(request,reason)=>{
    if(!localStaticFallback)throw new Error(reason);
    console.warn("[xsus-preview-local-fallback]",JSON.stringify({reason}));
    try {return generateWorkerStaticPreview(request);}
    catch(error){
      console.warn("[xsus-preview-local-fallback-failure]",JSON.stringify({type:error?.name||"Error",code:typeof error?.code==="string"?error.code:"unknown"}));
      throw new Error("Local static preview generator failed");
    }
  };
  const previewProxy=previewProxyEnabled?async(request)=>{
    // Staging fallback runs the same deterministic generator without relying
    // on an intermittently unavailable external Render Free worker gateway.
    if(localStaticFallback)return fallbackPreview(request,"staging_local_static_generator");
    let response;
    for(let attempt=1;attempt<=4;attempt++){
      // Probe upstream readiness before posting a preview. The worker can be
      // cold-starting on Render; a failed probe is diagnostic, not authorization.
      if(attempt===1){
        try{
          const health=await fetch(new URL("/healthz",env.XSUS_BUILD_WORKER_URL),{
            method:"GET",signal:AbortSignal.timeout(12000),redirect:"error"
          });
          console.info("[xsus-worker-readiness]",JSON.stringify({status:health.status,ok:health.ok}));
          await health.body?.cancel();
        }catch{console.info("[xsus-worker-readiness]",JSON.stringify({ok:false}));}
      }
      try {
        response=await fetch(new URL("/internal/static-preview",env.XSUS_BUILD_WORKER_URL),{
          method:"POST",headers:{"authorization":"Bearer "+env.XSUS_BUILD_WORKER_SHARED_SECRET,"content-type":"application/json"},
          body:JSON.stringify(request),signal:AbortSignal.timeout(25000),redirect:"error"
        });
      } catch(error) {
        console.info("[xsus-preview-proxy-diagnostic]",JSON.stringify({stage:"worker_network",reason:error?.name==="TimeoutError"?"timeout":"network_error",attempt}));
        if(attempt===4)return fallbackPreview(request,"worker_network_unavailable");
        await new Promise(resolve=>setTimeout(resolve,attempt===1?3000:attempt===2?7000:12000));
        continue;
      }
      if(response.ok)break;
      console.info("[xsus-preview-proxy-diagnostic]",JSON.stringify({stage:"worker_response",status:response.status,attempt}));
      if(![502,503,504].includes(response.status))throw new Error("Worker preview failed");
      if(attempt===4)return fallbackPreview(request,"worker_gateway_unavailable");
      await response.body?.cancel();
      await new Promise(resolve=>setTimeout(resolve,attempt===1?3000:attempt===2?7000:12000));
    }
    const result=await response.json();
    if(result?.kind!=="static-preview"||result?.requiresReview!==true||!Array.isArray(result.files)||result.files.length!==3||
       JSON.stringify(result.files.map(f=>f.path))!==JSON.stringify(["index.html","styles.css","main.js"])||
       result.files.some(f=>typeof f.content!=="string"||f.content.length>500000)){console.info("[xsus-preview-proxy-diagnostic]",JSON.stringify({stage:"manifest",kind:result?.kind,files:Array.isArray(result?.files)?result.files.map(f=>f.path):[]}));throw new Error("Invalid preview manifest");}
    return result;
  }:undefined;
  const androidJobs=restConfigured&&env.XSUS_ANDROID_ORCHESTRATION_ENABLED==='true'?createAndroidBuildJobs({env}):null;
  const server=createStandaloneDeploymentServer({...dependencies,androidJobs,...integration,...restIntegration,workerConnectivity,connectivityToken:workerConfigured?env.XSUS_BUILD_STATUS_TOKEN:undefined,previewProxyEnabled,previewProxy,
    userPreviewEnabled:previewProxyEnabled&&restConfigured&&env.XSUS_USER_PROJECT_PREVIEW_ENABLED==='true',
    createUserPreviewClient:restConfigured?(token)=>createSupabaseRestReviewClient({url:supabaseUrl,publishableKey,accessToken:token}):undefined,
    allowedOrigins:typeof env.XSUS_APP_ALLOWED_ORIGINS==='string'?env.XSUS_APP_ALLOWED_ORIGINS.split(',').map(x=>x.trim()).filter(x=>/^https:\/\//.test(x)):[]});
  server.listen(port,'0.0.0.0',()=>{
    if(previewProxyEnabled&&env.XSUS_PREVIEW_PROXY_SMOKE==="true"){
      void (async()=>{
        try{
          const response=await fetch("http://127.0.0.1:"+server.address().port+"/internal/build-preview",{
            method:"POST",
            headers:{"authorization":"Bearer "+env.XSUS_BUILD_STATUS_TOKEN,"content-type":"application/json"},
            body:JSON.stringify({name:"XSUS Proxy Verification"}),
            signal:AbortSignal.timeout(105000)
          });
          const result=await response.json();
          const paths=Array.isArray(result?.files)?result.files.map(f=>f.path):[];
          const success=response.status===200&&result?.kind==="static-preview"&&
            JSON.stringify(paths)===JSON.stringify(["index.html","styles.css","main.js"])&&
            result.files.every(f=>typeof f.content==="string"&&f.content.length>0);
          console.info("[xsus-preview-proxy-smoke]",JSON.stringify({success,status:response.status,files:success?paths:[]}));
        }catch{
          console.info("[xsus-preview-proxy-smoke]",JSON.stringify({success:false}));
        }
      })();
    }
    if(workerConfigured&&env.XSUS_STATIC_PREVIEW_PROBE==="true"){
      void (async()=>{
        try{
          const response=await fetch(new URL("/internal/static-preview",env.XSUS_BUILD_WORKER_URL),{
            method:"POST",
            headers:{"authorization":"Bearer "+env.XSUS_BUILD_WORKER_SHARED_SECRET,"content-type":"application/json"},
            body:JSON.stringify({name:"XSUS Preview Smoke Test"}),
            signal:AbortSignal.timeout(12000)
          });
          const result=await response.json();
          const paths=Array.isArray(result?.files)?result.files.map(f=>f.path):[];
          const valid=response.ok&&result?.kind==="static-preview"&&result?.requiresReview===true&&
            JSON.stringify(paths)===JSON.stringify(["index.html","styles.css","main.js"])&&
            result.files.every(f=>typeof f.content==="string"&&f.content.length>0);
          console.info("[xsus-static-preview-smoke]",JSON.stringify({success:valid,status:response.status,files:valid?paths:[]}));
        }catch{
          console.info("[xsus-static-preview-smoke]",JSON.stringify({success:false}));
        }
      })();
    }
    if(workerConnectivity){
      void workerConnectivity.check().then(result=>{
        console.info('[xsus-build-worker-connectivity]',JSON.stringify({connected:result.connected===true,buildEnabled:false}));
      }).catch(()=>console.info('[xsus-build-worker-connectivity]',JSON.stringify({connected:false,buildEnabled:false})));
    }
  });
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  startStandaloneDeploymentServer({
    env:process.env,
    dependencies:{allowedOrigins:(process.env.XSUS_APP_ALLOWED_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)}
  });
