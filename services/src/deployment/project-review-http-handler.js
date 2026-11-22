// Explicitly injected authenticated project review endpoint; no deploy capability.
import {isPersistedBuilderProjectId} from './project-id-contract.js';
const json=(status,body)=>({status,body:{...body,deployed:false},headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleProjectReviewHttp(input,deps={}) {
 if(input?.method!=='POST') return json(405,{error:'method_not_allowed'});
 const origin=input.headers?.origin;
 if(typeof origin!=='string'||!deps.allowedOrigins?.includes(origin))
  return json(403,{error:'origin_not_allowed'});
 const type=String(input.headers?.['content-type']??'').toLowerCase();
 if(!/^application\/json(?:\s*;|\s*$)/.test(type))
  return json(415,{error:'unsupported_media_type'});
 const auth=input.headers?.authorization;
 if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(auth))
  return json(401,{error:'authentication_required'});
 if(typeof input.body!=='string'||Buffer.byteLength(input.body,'utf8')>4096)
  return json(413,{error:'invalid_body_size'});
 let request;
 try {request=JSON.parse(input.body);} catch{return json(400,{error:'invalid_json'});}
 if(!request||Array.isArray(request)||typeof request!=='object'||
    !isPersistedBuilderProjectId(request.projectId))
  return json(400,{error:'invalid_project_id'});
 if(typeof deps.projectReviewer?.review!=='function' && typeof deps.createProjectReviewer!=='function')
  return json(503,{error:'review_not_configured'});
 try {
  const reviewer=typeof deps.createProjectReviewer==='function'
   ? deps.createProjectReviewer(auth.slice(7)) : deps.projectReviewer;
  if(typeof reviewer?.review!=='function')return json(503,{error:'review_not_configured'});
  const result=await reviewer.review({projectId:request.projectId,accessToken:auth.slice(7)});
  // Only return a bounded, non-sensitive status; do not expose artifacts or internal exceptions.
  if(result?.status==='ready-for-review'&&result.deployed===false)
   return json(200,{status:'ready-for-review',reason:'STATIC_REVIEW_ONLY'});
  // Only an authenticated owner can reach build preflight; distinguish a
  // missing trusted builder from an authentication/ownership denial.
  if(result?.reason==='BUILD_PREFLIGHT_FAILED')
   return json(409,{status:'blocked',reason:'BUILD_NOT_AVAILABLE'});
  return json(403,{status:'denied',reason:'REVIEW_DENIED'});
 } catch{return json(503,{error:'review_unavailable'});}
}
