import {describe,it,expect} from "vitest";
import {once} from "node:events";
import {createStandaloneDeploymentServer} from "../../services/src/deployment/standalone-server.js";
const projectId="33333333-3333-4333-8333-333333333333";
const ownerId="11111111-1111-4111-8111-111111111111";
const origin="https://www.xsusstudio.com";
async function run({enabled=true,token="valid-token-long-enough",requestProjectId=projectId,storedOwner=ownerId,originHeader=origin,authUser=ownerId,previewFails=false,invalidFiles=false,goal="Notes app",dbError=false,missingProject=false}={}){
 let calls=0;
 const server=createStandaloneDeploymentServer({
   allowedOrigins:[origin],userPreviewEnabled:enabled,
   createUserPreviewClient:()=>({
     auth:{getUser:async()=>({data:{user:authUser?{id:authUser}:null},error:authUser?null:{message:"invalid"}})},
     from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:missingProject?null:{id:projectId,owner_id:storedOwner,snapshot:{goal}},error:dbError?{message:"database unavailable"}:null})};return q;}
   }),
   previewProxy:async()=>{calls++;if(previewFails)throw Error("worker offline");return {kind:"static-preview",requiresReview:true,files:invalidFiles?[{path:"index.html",content:"ok"}]:[{path:"index.html",content:"<html></html>"},{path:"styles.css",content:"body{}"},{path:"main.js",content:"console.log(1)"}]};}
 });
 server.listen(0,"127.0.0.1");await once(server,"listening");
 try{
  const response=await fetch("http://127.0.0.1:"+server.address().port+"/api/projects/build-preview",{method:"POST",headers:{"origin":originHeader,"authorization":"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({projectId:requestProjectId})});
  return {status:response.status,body:await response.json(),calls};
 }finally{await new Promise(resolve=>server.close(resolve));}
}
describe("XSUS saved-project owner preview",()=>{
 it("generates only after authenticated owner lookup",async()=>{const r=await run();expect(r.status).toBe(200);expect(r.calls).toBe(1);expect(r.body.projectId).toBe(projectId);});
 it("defaults to disabled",async()=>{const r=await run({enabled:false});expect(r.status).toBe(503);expect(r.calls).toBe(0);});
 it("denies another owner's project",async()=>{const r=await run({storedOwner:"22222222-2222-4222-8222-222222222222"});expect(r.status).toBe(404);expect(r.calls).toBe(0);});
 it("does not expose nonexistent projects",async()=>{const r=await run({missingProject:true});expect(r.status).toBe(404);expect(r.calls).toBe(0);});
 it("fails closed on a Supabase project lookup error",async()=>{const r=await run({dbError:true});expect(r.status).toBe(503);expect(r.calls).toBe(0);});
 it("denies invalid auth",async()=>{const r=await run({authUser:null});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("rejects requests without an Origin header",async()=>{
  const server=createStandaloneDeploymentServer({allowedOrigins:[origin],userPreviewEnabled:true,createUserPreviewClient:()=>{throw Error("must not authenticate");},previewProxy:()=>{throw Error("must not generate");}});
  server.listen(0,"127.0.0.1");await once(server,"listening");
  try{
   const response=await fetch("http://127.0.0.1:"+server.address().port+"/api/projects/build-preview",{method:"POST",headers:{"authorization":"Bearer valid-token-long-enough","content-type":"application/json"},body:JSON.stringify({projectId})});
   expect(response.status).toBe(403);
   expect(response.headers.get("access-control-allow-origin")).toBeNull();
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
 it("denies unknown browser origin",async()=>{const r=await run({originHeader:"https://evil.example"});expect(r.status).toBe(403);expect(r.calls).toBe(0);});
 it("rejects malformed project IDs",async()=>{const r=await run({requestProjectId:"not-an-id"});expect(r.status).toBe(400);expect(r.calls).toBe(0);});
 it("rejects missing bearer credentials",async()=>{const r=await run({token:""});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("rejects short bearer tokens before creating the Supabase client",async()=>{const r=await run({token:"short"});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("rejects oversized bearer tokens",async()=>{const r=await run({token:"x".repeat(8200)});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("rejects a token with spaces",async()=>{const r=await run({token:"bad token"});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("does not return preview files to a different authenticated user",async()=>{const r=await run({authUser:"99999999-9999-4999-8999-999999999999"});expect(r.status).toBe(404);expect(r.calls).toBe(0);});
 it("rejects incomplete worker artifact manifests",async()=>{const r=await run({invalidFiles:true});expect(r.status).toBe(503);expect(r.calls).toBe(1);});
 it("rejects a saved project without a usable goal",async()=>{const r=await run({goal:"   "});expect(r.status).toBe(422);expect(r.calls).toBe(0);});
 it("rejects oversized generated files",async()=>{
  let calls=0;
  const server=createStandaloneDeploymentServer({
   allowedOrigins:[origin],userPreviewEnabled:true,
   createUserPreviewClient:()=>({auth:{getUser:async()=>({data:{user:{id:ownerId}},error:null})},from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:projectId,owner_id:ownerId,snapshot:{goal:"Notes app"}},error:null})};return q;}}),
   previewProxy:async()=>{calls++;return {kind:"static-preview",requiresReview:true,files:[{path:"index.html",content:"x".repeat(250001)},{path:"styles.css",content:"body{}"},{path:"main.js",content:"void 0"}]};}
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  try{const response=await fetch("http://127.0.0.1:"+server.address().port+"/api/projects/build-preview",{method:"POST",headers:{origin,authorization:"Bearer valid-token-long-enough","content-type":"application/json"},body:JSON.stringify({projectId})});expect(response.status).toBe(503);expect(calls).toBe(1);}
  finally{await new Promise(resolve=>server.close(resolve));}
 });
 it("allows only the expected CORS preflight",async()=>{
  const server=createStandaloneDeploymentServer({allowedOrigins:[origin]});
  server.listen(0,"127.0.0.1");await once(server,"listening");
  try{
   const url="http://127.0.0.1:"+server.address().port+"/api/projects/build-preview";
   const allowed=await fetch(url,{method:"OPTIONS",headers:{origin,"access-control-request-method":"POST","access-control-request-headers":"authorization, content-type"}});
   expect(allowed.status).toBe(204);
   expect(allowed.headers.get("access-control-allow-origin")).toBe(origin);
   const denied=await fetch(url,{method:"OPTIONS",headers:{origin,"access-control-request-method":"POST","access-control-request-headers":"x-admin-token"}});
   expect(denied.status).toBe(403);
   const foreign=await fetch(url,{method:"OPTIONS",headers:{origin:"https://evil.example","access-control-request-method":"POST"}});
   expect(foreign.status).toBe(403);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
 it("rejects malformed JSON before Supabase access",async()=>{
  const server=createStandaloneDeploymentServer({allowedOrigins:[origin],userPreviewEnabled:true,createUserPreviewClient:()=>{throw Error("unexpected Supabase access");},previewProxy:()=>{throw Error("unexpected worker access");}});
  server.listen(0,"127.0.0.1");await once(server,"listening");
  try{
   const url="http://127.0.0.1:"+server.address().port+"/api/projects/build-preview";
   const headers={origin,authorization:"Bearer valid-token-long-enough","content-type":"application/json"};
   const malformed=await fetch(url,{method:"POST",headers,body:"{"});
   expect(malformed.status).toBe(400);
   const oversized=await fetch(url,{method:"POST",headers,body:JSON.stringify({projectId,extra:"x".repeat(2100)})});
   expect(oversized.status).toBe(413);
   const extra=await fetch(url,{method:"POST",headers,body:JSON.stringify({projectId,extra:true})});
   expect(extra.status).toBe(400);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
 it("fails closed if worker unavailable",async()=>{const r=await run({previewFails:true});expect(r.status).toBe(503);});
});
