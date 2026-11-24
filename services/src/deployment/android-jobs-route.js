import {isPersistedBuilderProjectId} from "./project-id-contract.js";

// Server-owned dependencies. The caller supplies neither owner identity nor project goal.
export function createAndroidJobsRoute({jobs,createUserClient,allowedOrigins=[]}={}){
 return async function handle(req,res){
  const origin=req.headers.origin;
  const allowed=typeof origin==="string"&&allowedOrigins.includes(origin);
  const headers={"cache-control":"no-store","x-content-type-options":"nosniff","content-type":"application/json",...(allowed?{"access-control-allow-origin":origin,vary:"Origin"}:{})};
  const send=(status,body)=>{res.writeHead(status,headers);res.end(JSON.stringify(body));};
  if(!allowed)return send(403,{error:"origin_not_allowed"});
  if(req.method==="OPTIONS"){
   if(!["POST","GET"].includes(req.headers["access-control-request-method"])||String(req.headers["access-control-request-headers"]??"").toLowerCase().split(",").some(h=>h.trim()&&!["authorization","content-type"].includes(h.trim())))return send(403,{error:"preflight_denied"});
   res.writeHead(204,{...headers,"access-control-allow-methods":"POST, GET","access-control-allow-headers":"authorization, content-type"});res.end();return;
  }
  const path=req.url?.split("?")[0]??"";
  const collection=path==="/api/android/jobs";
  const id=path.slice("/api/android/jobs/".length);
  if(!collection&&!isPersistedBuilderProjectId(id))return send(404,{error:"not_found"});
  if((collection&&req.method!=="POST")||(!collection&&req.method!=="GET"))return send(405,{error:"method_not_allowed"});
  if(!jobs||typeof createUserClient!=="function")return send(503,{error:"android_build_unavailable"});
  const auth=req.headers.authorization;
  if(typeof auth!=="string"||auth.length<23||auth.length>8200||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(auth))return send(401,{error:"authentication_required"});
  try{
   const token=auth.slice(7),client=createUserClient(token);
   const verified=await client.auth.getUser(token);
   const owner=verified?.data?.user?.id;
   if(verified?.error||typeof owner!=="string"||!owner)return send(401,{error:"authentication_required"});
   if(!collection){
    const job=jobs.get(owner,id);
    return job?send(200,job):send(404,{error:"not_found"});
   }
   if(!/^application\/json(?:\s*;|\s*$)/i.test(req.headers["content-type"]??""))return send(415,{error:"unsupported_media_type"});
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>2048)return send(413,{error:"payload_too_large"});chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{return send(400,{error:"invalid_json"});}
   if(!body||Object.keys(body).sort().join(",")!=="applicationId,approved,displayName,projectId"||!isPersistedBuilderProjectId(body.projectId)||body.approved!==true||typeof body.applicationId!=="string"||body.applicationId.length>150||! /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(body.applicationId)||typeof body.displayName!=="string"||!body.displayName.trim()||body.displayName.length>80||/[\x00-\x1f\x7f]/.test(body.displayName))return send(400,{error:"invalid_request"});
   const {data,error}=await client.from("xsus_builder_projects").select("id,owner_id,snapshot").eq("id",body.projectId).eq("owner_id",owner).maybeSingle();
   if(error)return send(503,{error:"project_unavailable"});
   if(!data||data.id!==body.projectId||data.owner_id!==owner)return send(404,{error:"not_found"});
   // Older account snapshots may contain an empty composer after submission.
   // Recover only the original user request from the owner-verified saved session.
   const snapshot=data.snapshot;
   let goal=snapshot?.goal;
   if(snapshot?.version===1&&typeof goal==="string"&&!goal.trim()&&Array.isArray(snapshot.session?.messages)){
    const first=snapshot.session.messages.find(message=>message?.role==="user");
    if(typeof first?.text==="string")goal=first.text.split(/\r?\n\r?\n/,1)[0].trim();
   }
   if(typeof goal!=="string"||!goal.trim()||goal.length>2000)return send(422,{error:"invalid_saved_project"});
   let job;
   try{job=jobs.submit({owner,projectId:body.projectId,goal,applicationId:body.applicationId,displayName:body.displayName,approved:true});}
   catch(e){return e?.message==="Build capacity unavailable"?send(429,{error:"build_capacity_unavailable"}):send(503,{error:"android_build_unavailable"});}
   return send(202,job);
  }catch{return send(503,{error:"android_build_unavailable"});}
 };
}
