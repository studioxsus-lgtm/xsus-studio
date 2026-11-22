// XSUS App deployment validation service. Separate from XSUS AI Core.
// No provider deployments, no credentials loaded, and no production integrations by default.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createDeploymentNodeHandler } from './deployment-node-adapter.js';
import { createSupabaseProjectReviewIntegration } from './supabase-project-review-integration.js';

export function createStandaloneDeploymentServer(dependencies={}) {
  const route=createDeploymentNodeHandler(dependencies);
  return http.createServer((req,res)=>{
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
  const server=createStandaloneDeploymentServer({...dependencies,...integration});
  server.listen(port,'0.0.0.0');
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  startStandaloneDeploymentServer({
    env:process.env,
    dependencies:{allowedOrigins:(process.env.XSUS_APP_ALLOWED_ORIGINS??'').split(',').map(x=>x.trim()).filter(Boolean)}
  });
