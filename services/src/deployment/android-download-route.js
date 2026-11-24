import {isPersistedBuilderProjectId} from "./project-id-contract.js";
import {createHash} from "node:crypto";

export function createAndroidDownloadRoute({store,createUserClient,allowedOrigins=[]}={}){
 return async function handle(req,res){
  const origin=req.headers.origin,allowed=typeof origin==="string"&&allowedOrigins.includes(origin);
  const headers={"cache-control":"no-store","x-content-type-options":"nosniff",...(allowed?{"access-control-allow-origin":origin,vary:"Origin"}:{})};
  const send=(status,error)=>{res.writeHead(status,{...headers,"content-type":"application/json"});res.end(JSON.stringify({error}));};
  if(!allowed)return send(403,"origin_not_allowed");
  const match=/^\/api\/android\/artifacts\/([^/]+)\/download$/.exec(req.url?.split("?")[0]??"");
  if(!match||!isPersistedBuilderProjectId(match[1]))return send(404,"not_found");
  if(req.method==="OPTIONS"){
   if(req.headers["access-control-request-method"]!=="GET"||String(req.headers["access-control-request-headers"]??"").toLowerCase().split(",").some(h=>h.trim()&&h.trim()!=="authorization"))return send(403,"preflight_denied");
   res.writeHead(204,{...headers,"access-control-allow-methods":"GET","access-control-allow-headers":"authorization"});res.end();return;
  }
  if(req.method!=="GET")return send(405,"method_not_allowed");
  if(!store||typeof createUserClient!=="function")return send(503,"download_unavailable");
  const auth=req.headers.authorization;
  if(typeof auth!=="string"||auth.length<23||auth.length>8200||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(auth))return send(401,"authentication_required");
  try{
   const token=auth.slice(7),client=createUserClient(token),verified=await client.auth.getUser(token),owner=verified?.data?.user?.id;
   if(verified?.error||typeof owner!=="string"||!owner)return send(401,"authentication_required");
   const artifact=await store.get(owner,match[1]);
   if(!artifact)return send(404,"not_found");
   const {data,error}=await client.from("xsus_builder_projects").select("id,owner_id").eq("id",artifact.projectId).eq("owner_id",owner).maybeSingle();
   if(error)return send(503,"project_unavailable");
   if(!data||data.id!==artifact.projectId||data.owner_id!==owner)return send(404,"not_found");
   if(!Buffer.isBuffer(artifact.bytes)||artifact.bytes.length<4||artifact.bytes.length!==artifact.size||artifact.bytes.subarray(0,4).toString("hex")!=="504b0304"||createHash("sha256").update(artifact.bytes).digest("hex")!==artifact.sha256)return send(503,"artifact_integrity_failure");
   res.writeHead(200,{...headers,"content-type":"application/vnd.android.package-archive","content-disposition":'attachment; filename="xsus-app-debug.apk"',"content-length":artifact.size,"x-xsus-sha256":artifact.sha256,"access-control-expose-headers":"content-disposition, x-xsus-sha256"});
   res.end(artifact.bytes);
  }catch{if(!res.headersSent)send(503,"download_unavailable");else res.destroy();}
 };
}
