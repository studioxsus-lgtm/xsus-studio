import {describe,it,expect,vi} from "vitest";
import {createStandaloneDeploymentServer} from "../../services/src/deployment/standalone-server.js";
const origin="https://www.xsusstudio.com",projectId="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
const token="test-token-abcdefghijklmnop";
const payload={projectId,applicationId:"com.xsus.tasks",displayName:"Tasks",approved:true};
const headers={origin,authorization:"Bearer "+token,"content-type":"application/json"};
async function fixture(test,{enabled=true,owner="owner-a",authenticated=true,lookupError=false}={}){
 const submit=vi.fn(()=>({id,projectId,status:"queued"}));
 const get=vi.fn((owner,key)=>owner==="owner-a"&&key===id?{id,projectId,status:"building"}:null);
 const eq=vi.fn().mockReturnThis();
 const client={auth:{getUser:vi.fn(async()=>authenticated?{data:{user:{id:"owner-a"}}}:{error:true})},from:vi.fn(()=>({select:()=>({eq,maybeSingle:async()=>({data:{id:projectId,owner_id:owner,snapshot:{goal:"Krijo aplikacion Android me menaxhim detyrash"}},error:lookupError})})}))};
 const server=createStandaloneDeploymentServer({allowedOrigins:[origin],androidJobs:enabled?{submit,get}:null,createUserPreviewClient:()=>client});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const request=(path="/api/android/jobs",options={})=>fetch("http://127.0.0.1:"+server.address().port+path,{method:"POST",headers,body:JSON.stringify(payload),...options});
 try{await test({request,submit,get,client,eq});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
describe("Android jobs HTTP integration",()=>{
 it("accepts an authenticated owned saved project",()=>fixture(async({request,submit,eq})=>{const r=await request();expect(r.status).toBe(202);expect((await r.json()).id).toBe(id);expect(eq).toHaveBeenCalledWith("owner_id","owner-a");expect(submit).toHaveBeenCalledWith({...payload,owner:"owner-a",goal:"Krijo aplikacion Android me menaxhim detyrash"});}));
 it("denies foreign origins",()=>fixture(async({request,submit})=>{expect((await request(undefined,{headers:{...headers,origin:"https://evil.example"}})).status).toBe(403);expect(submit).not.toHaveBeenCalled();}));
 it("denies missing credentials",()=>fixture(async({request,submit})=>{expect((await request(undefined,{headers:{origin,"content-type":"application/json"}})).status).toBe(401);expect(submit).not.toHaveBeenCalled();}));
 it("denies invalid sessions",()=>fixture(async({request,submit})=>{expect((await request()).status).toBe(401);expect(submit).not.toHaveBeenCalled();},{authenticated:false}));
 it("denies foreign projects",()=>fixture(async({request,submit})=>{expect((await request()).status).toBe(404);expect(submit).not.toHaveBeenCalled();},{owner:"owner-b"}));
 it("fails closed on database errors",()=>fixture(async({request,submit})=>{expect((await request()).status).toBe(503);expect(submit).not.toHaveBeenCalled();},{lookupError:true}));
 it("rejects client-supplied ownership",()=>fixture(async({request,submit})=>{expect((await request(undefined,{body:JSON.stringify({...payload,owner:"owner-a"})})).status).toBe(400);expect(submit).not.toHaveBeenCalled();}));
 it("requires explicit approval",()=>fixture(async({request,submit})=>{expect((await request(undefined,{body:JSON.stringify({...payload,approved:false})})).status).toBe(400);expect(submit).not.toHaveBeenCalled();}));
 it("rejects oversized requests",()=>fixture(async({request,submit})=>{expect((await request(undefined,{body:JSON.stringify({...payload,displayName:"x".repeat(3000)})})).status).toBe(413);expect(submit).not.toHaveBeenCalled();}));
 it("fails closed when disabled",()=>fixture(async({request})=>{expect((await request()).status).toBe(503);},{enabled:false}));
 it("reads owner-scoped status",()=>fixture(async({request,get})=>{const r=await request("/api/android/jobs/"+id,{method:"GET",body:undefined});expect(r.status).toBe(200);expect(get).toHaveBeenCalledWith("owner-a",id);}));
 it("conceals unknown job IDs",()=>fixture(async({request})=>{expect((await request("/api/android/jobs/"+projectId,{method:"GET",body:undefined})).status).toBe(404);}));
 it("accepts restricted CORS preflight",()=>fixture(async({request})=>{const r=await request(undefined,{method:"OPTIONS",body:undefined,headers:{origin,"access-control-request-method":"POST","access-control-request-headers":"authorization, content-type"}});expect(r.status).toBe(204);expect(r.headers.get("access-control-allow-origin")).toBe(origin);}));
 it("rejects unexpected preflight headers",()=>fixture(async({request})=>{expect((await request(undefined,{method:"OPTIONS",body:undefined,headers:{origin,"access-control-request-method":"POST","access-control-request-headers":"x-admin"}})).status).toBe(403);}));
});
