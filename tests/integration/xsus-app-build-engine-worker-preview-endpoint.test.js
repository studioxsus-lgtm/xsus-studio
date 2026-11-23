import {describe,it,expect} from "vitest";
import {once} from "node:events";
import {createBuildWorkerServer} from "../../services/src/build-worker/standalone-worker.js";
const secret="test-secret-with-more-than-32-characters";
async function request({previewEnabled=true,token=secret,body={name:"Notes App"}}={}){
 const server=createBuildWorkerServer({sharedSecret:secret,previewEnabled});
 server.listen(0,"127.0.0.1");await once(server,"listening");
 try{
  const response=await fetch("http://127.0.0.1:"+server.address().port+"/internal/static-preview",{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 }finally{await new Promise(resolve=>server.close(resolve));}
}
describe("XSUS authenticated static preview endpoint",()=>{
 it("returns three generated files when explicitly enabled",async()=>{const r=await request();expect(r.status).toBe(200);expect(r.data.files.map(f=>f.path)).toEqual(["index.html","styles.css","main.js"]);});
 it("is disabled by default",async()=>expect((await request({previewEnabled:false})).status).toBe(503));
 it("rejects absent authentication",async()=>expect((await request({token:null})).status).toBe(401));
 it("rejects incorrect authentication",async()=>expect((await request({token:"wrong"})).status).toBe(401));
 it("rejects malformed project names",async()=>expect((await request({body:{name:""}})).status).toBe(400));
 it("rejects extra user-supplied fields",async()=>expect((await request({body:{name:"Notes",ownerId:"admin"}})).status).toBe(400));
 it("escapes HTML in generated title",async()=>{const r=await request({body:{name:"<script>alert(1)</script>"}});expect(r.status).toBe(200);expect(r.data.files[0].content).not.toContain("<script>");});
 it("never claims Docker execution",async()=>{const r=await request();expect(r.data.kind).toBe("static-preview");expect(r.data.requiresReview).toBe(true);});
});
