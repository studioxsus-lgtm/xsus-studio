import { createSupabaseDeploymentContext } from './supabase-project-authorization.js';
import { validateDeploymentRequest } from './deployment-validation-service.js';

// Framework-neutral handler; does not open a port, deploy, or trust caller-provided identity.
const MAX_BODY_BYTES=16*1024;
const json=(status,body)=>({status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},body});
export async function handleDeploymentValidationHttp(input,dependencies={}) {
  if (input?.method!=='POST') return json(405,{error:'method_not_allowed',deployed:false});
  const type=String(input.headers?.['content-type']??input.headers?.['Content-Type']??'').toLowerCase();
  if (!/^application\/json(?:\s*;|\s*$)/.test(type))
    return json(415,{error:'unsupported_media_type',deployed:false});
  const origin=String(input.headers?.origin??input.headers?.Origin??'');
  if (!dependencies.allowedOrigins?.includes(origin))
    return json(403,{error:'origin_not_allowed',deployed:false});
  const authorization=String(input.headers?.authorization??input.headers?.Authorization??'');
  if (!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(authorization))
    return json(401,{error:'authentication_required',deployed:false});
  if (typeof input.body!=='string' || Buffer.byteLength(input.body,'utf8')>MAX_BODY_BYTES)
    return json(413,{error:'invalid_body_size',deployed:false});
  let request;
  try { request=JSON.parse(input.body); } catch { return json(400,{error:'invalid_json',deployed:false}); }
  if (!request || Array.isArray(request) || typeof request!=='object')
    return json(400,{error:'invalid_request',deployed:false});
  if (!dependencies.authClient || !dependencies.projectStore || !dependencies.artifactStore)
    return json(503,{error:'backend_not_configured',deployed:false});
  try {
    const context=createSupabaseDeploymentContext({
      authClient:dependencies.authClient,projectStore:dependencies.projectStore,
      artifactStore:dependencies.artifactStore,accessToken:authorization.slice(7)
    });
    const result=await validateDeploymentRequest(request,context);
    return json(result.status==='denied'?403:200,result);
  } catch {
    return json(503,{error:'validation_unavailable',deployed:false});
  }
}
