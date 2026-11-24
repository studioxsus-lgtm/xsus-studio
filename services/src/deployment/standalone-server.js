// XSUS App deployment validation service. Separate from XSUS AI Core.
// No provider deployments, no credentials loaded, and no production integrations by default.
import http from 'node:http';
import {mkdtempSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAndroidArtifactStore} from './android-artifact-store.js';
import {createAndroidDownloadRoute} from './android-download-route.js';
import {createAndroidBuildJobs} from './android-build-jobs.js';
import {createAndroidJobsRoute} from './android-jobs-route.js';
import { pathToFileURL } from 'node:url';
import { createDeploymentNodeHandler } from './deployment-node-adapter.js';
import { createSupabaseProjectReviewIntegration } from './supabase-project-review-integration.js';
import { createSupabaseRestReviewClient } from './supabase-rest-review-client.js';

export function createStandaloneDeploymentServer(dependencies={}) {
  const route=createDeploymentNodeHandler(dependencies);
  const androidRoute=createAndroidJobsRoute({jobs:dependencies.androidJobs,createUserClient:dependencies.createUserPreviewClient,allowedOrigins:dependencies.allowedOrigins});
  const androidDownload=createAndroidDownloadRoute({store:dependencies.androidStore,createUserClient:dependencies.createUserPreviewClient,allowedOrigins:dependencies.allowedOrigins});
  return http.createServer((req,res)=>{
    const androidPath=req.url?.split('?')[0];
    if(dependencies.androidJobs&&androidPath?.startsWith('/api/android/artifacts/')){void androidDownload(req,res);return;}
    if(dependencies.androidJobs&&(androidPath==='/api/android/jobs'||androidPath?.startsWith('/api/android/jobs/'))){void androidRoute(req,res);return;}
    if (req.url?.split('?')[0]==='/healthz' && req.method==='GET') {
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
      res.end(JSON.stringify({ok:true,service:'xsus-app-deployment-validation',deploymentEnabled:false}));
      return;
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
      // Production remains validation-only. Experimental builder lives
      // exclusively on feature/xsus-app-build-engine.
      return createSupabaseProjectReviewIntegration({supabaseClient:client,
        buildFromSavedProject:async()=>null}).projectReviewer;
    }
  } : {};
  const androidEnabled=restConfigured&&env.XSUS_ANDROID_ORCHESTRATION_ENABLED==='true'&&env.XSUS_ANDROID_ARTIFACT_DELIVERY_ENABLED==='true';
  const androidRoot=androidEnabled?mkdtempSync(join(tmpdir(),'xsus-private-apk-')):null;
  const androidStore=androidRoot?createAndroidArtifactStore({root:androidRoot}):null;
  const androidJobs=androidStore?createAndroidBuildJobs({env,store:androidStore}):null;
  const server=createStandaloneDeploymentServer({...dependencies,...integration,...restIntegration,androidJobs,androidStore,
    createUserPreviewClient:androidEnabled?(accessToken)=>createSupabaseRestReviewClient({url:supabaseUrl,publishableKey,accessToken}):undefined});
  if(androidStore){
    const cleanup=setInterval(()=>{void androidStore.prune().catch(()=>console.warn('[xsus-android-storage-cleanup-failed]'));},60000);
    cleanup.unref();
    server.once('close',()=>{clearInterval(cleanup);void rm(androidRoot,{recursive:true,force:true}).catch(()=>{});});
  }
  server.listen(port,'0.0.0.0');
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  startStandaloneDeploymentServer({
    env:process.env,
    dependencies:{allowedOrigins:(process.env.XSUS_APP_ALLOWED_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)}
  });
