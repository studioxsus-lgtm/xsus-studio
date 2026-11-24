import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createAndroidBuildJobs} from "../../services/src/deployment/android-build-jobs.js";
import {createAndroidArtifactStore} from "../../services/src/deployment/android-artifact-store.js";
import {createStandaloneDeploymentServer} from "../../services/src/deployment/standalone-server.js";
const projectId="11111111-1111-4111-8111-111111111111",applicationId="com.xsus.tasks",origin="https://www.xsusstudio.com";
const bytes=Buffer.from("504b03040102","hex"),sha256=createHash("sha256").update(bytes).digest("hex");
const token="alice-token-abcdefghijklmnop",other="bob-token-abcdefghijklmnop";
async function fixture(fn,{verified=true,owned=true}={}){
 const root=await mkdtemp(join(tmpdir(),"xsus-delivery-test-"));
 const store=createAndroidArtifactStore({root});
 const jobs=createAndroidBuildJobs({env:{XSUS_ANDROID_ORCHESTRATION_ENABLED:"true"},store,orchestratorFactory:({authorize})=>async()=>{
  if(!await authorize({projectId,revision:1,snapshotDigest:"a".repeat(64),buildDigest:"b".repeat(64)}))throw Error("Denied");
  return {status:"compiled_pending_verification",artifact:{bytes,size:bytes.length,sha256,...(verified?{workerVerification:{applicationId,sha256,signatureVerified:true,applicationIdVerified:true,launcherVerified:true}}:{})}};
 }});
 const server=createStandaloneDeploymentServer({androidJobs:jobs,androidStore:store,allowedOrigins:[origin],createUserPreviewClient:t=>({auth:{getUser:async()=>({data:{user:{id:t===token?"alice":"bob"}}})},from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:owned?{id:projectId,owner_id:"alice",snapshot:{goal:"Krijo aplikacion Android me menaxhim detyrash"}}:null})};return query;}})});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const request=(path,options={},t=token)=>fetch("http://127.0.0.1:"+server.address().port+path,{...options,headers:{origin,authorization:"Bearer "+t,"content-type":"application/json",...options.headers}});
 async function build(){const r=await request("/api/android/jobs",{method:"POST",body:JSON.stringify({projectId,applicationId,displayName:"Tasks",approved:true})});expect(r.status).toBe(202);const {id}=await r.json();for(let i=0;i<100;i++){const s=await (await request("/api/android/jobs/"+id)).json();if(["verified_debug_apk","failed"].includes(s.status))return s;await new Promise(r=>setTimeout(r,10));}throw Error("Job timeout");}
 try{await fn({request,build});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
}
describe("Android end-to-end staging delivery (simulated worker)",()=>{
 it("delivers verified bytes to the authenticated owner",()=>fixture(async({request,build})=>{const s=await build();expect(s.status).toBe("verified_debug_apk");expect(s.signatureVerified).toBe(true);expect(s.installationVerified).toBe(false);const r=await request("/api/android/artifacts/"+s.artifactId+"/download");expect(r.status).toBe(200);expect(r.headers.get("content-type")).toBe("application/vnd.android.package-archive");expect(r.headers.get("x-xsus-sha256")).toBe(sha256);expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);}));
 it("rejects downloads by another authenticated owner",()=>fixture(async({request,build})=>{const s=await build();expect((await request("/api/android/artifacts/"+s.artifactId+"/download",{},other)).status).toBe(404);}));
 it("rejects unverified worker output without issuing artifact ID",()=>fixture(async({build})=>{const s=await build();expect(s.status).toBe("failed");expect(s).not.toHaveProperty("artifactId");},{verified:false}));
 it("rejects unauthenticated download",()=>fixture(async({request,build})=>{const s=await build();expect((await request("/api/android/artifacts/"+s.artifactId+"/download",{headers:{authorization:""}})).status).toBe(401);}));
 it("rejects foreign origin",()=>fixture(async({request,build})=>{const s=await build();expect((await request("/api/android/artifacts/"+s.artifactId+"/download",{headers:{origin:"https://evil.example"}})).status).toBe(403);}));
});
