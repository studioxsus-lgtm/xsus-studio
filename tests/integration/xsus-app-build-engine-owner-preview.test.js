import {describe,it,expect} from "vitest";
import {once} from "node:events";
import {createStandaloneDeploymentServer} from "../../services/src/deployment/standalone-server.js";
const projectId="33333333-3333-4333-8333-333333333333";
const ownerId="11111111-1111-4111-8111-111111111111";
const origin="https://www.xsusstudio.com";
async function run({enabled=true,token="valid-token-long-enough",requestProjectId=projectId,storedOwner=ownerId,originHeader=origin,authUser=ownerId,previewFails=false,invalidFiles=false}={}){
 let calls=0;
 const server=createStandaloneDeploymentServer({
   allowedOrigins:[origin],userPreviewEnabled:enabled,
   createUserPreviewClient:()=>({
     auth:{getUser:async()=>({data:{user:authUser?{id:authUser}:null},error:authUser?null:{message:"invalid"}})},
     from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:projectId,owner_id:storedOwner,snapshot:{goal:"Notes app"}},error:null})};return q;}
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
 it("denies invalid auth",async()=>{const r=await run({authUser:null});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("denies unknown browser origin",async()=>{const r=await run({originHeader:"https://evil.example"});expect(r.status).toBe(403);expect(r.calls).toBe(0);});
 it("rejects malformed project IDs",async()=>{const r=await run({requestProjectId:"not-an-id"});expect(r.status).toBe(400);expect(r.calls).toBe(0);});
 it("rejects missing bearer credentials",async()=>{const r=await run({token:""});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("rejects a token with spaces",async()=>{const r=await run({token:"bad token"});expect(r.status).toBe(401);expect(r.calls).toBe(0);});
 it("does not return preview files to a different authenticated user",async()=>{const r=await run({authUser:"99999999-9999-4999-8999-999999999999"});expect(r.status).toBe(404);expect(r.calls).toBe(0);});
 it("rejects incomplete worker artifact manifests",async()=>{const r=await run({invalidFiles:true});expect(r.status).toBe(503);expect(r.calls).toBe(1);});
 it("fails closed if worker unavailable",async()=>{const r=await run({previewFails:true});expect(r.status).toBe(503);});
});
