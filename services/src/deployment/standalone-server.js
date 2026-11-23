// XSUS App deployment validation service. Separate from XSUS AI Core.
// No provider deployments, no credentials loaded, and no production integrations by default.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createDeploymentNodeHandler } from './deployment-node-adapter.js';
import { createSupabaseProjectReviewIntegration } from './supabase-project-review-integration.js';
import { createSupabaseRestReviewClient } from './supabase-rest-review-client.js';
import { createXsUsAppSavedProjectBuilder } from './xsus-app-build-engine.js';
import { createBuildWorkerConnectivity } from './build-worker-connectivity.js';

export function createStandaloneDeploymentServer(dependencies={}) {
  const route=createDeploymentNodeHandler(dependencies);
  const workerConnectivity=dependencies.workerConnectivity;
  const connectivityToken=dependencies.connectivityToken;
  return http.createServer((req,res)=>{
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
  const server=createStandaloneDeploymentServer({...dependencies,...integration,...restIntegration,workerConnectivity,connectivityToken:workerConfigured?env.XSUS_BUILD_STATUS_TOKEN:undefined});
  server.listen(port,'0.0.0.0');
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  startStandaloneDeploymentServer({
    env:process.env,
    dependencies:{allowedOrigins:(process.env.XSUS_APP_ALLOWED_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)}
  });
