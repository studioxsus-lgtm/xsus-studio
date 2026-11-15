import {describe,it,expect,vi} from "vitest";
import {Readable} from "node:stream";
import {createHyperAppRuntimeAssembly} from "../../src/platform/xsus-app/hyper-v8238-runtime-assembly.js";

const USER="11111111-1111-4111-8111-111111111111";
const OBS="evidence_123";
const TOKEN="test-token-for-provider-123456";
const config=(fetchImpl,enabled=false)=>({
  supabaseUrl:"https://example-project.supabase.co",
  publishableKey:"test-publishable-key",
  serviceRoleKey:"test-server-secret",
  evidenceKey:Buffer.alloc(32,7),
  evidenceKeyId:"test-key-v1",
  fetchImpl,enabled
});
async function request(runtime,body={action:"evidence.verify",observationId:OBS}){
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method="POST";
  req.headers={"content-type":"application/json",authorization:"Bearer "+TOKEN};
  const res={writeHead:vi.fn(),end:vi.fn()};
  await runtime.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],body:JSON.parse(res.end.mock.calls[0][0])};
}
describe("Hyper v8.2.38 runtime assembly (mocked Supabase, no live changes)",()=>{
  it("remains disabled by default and never contacts Supabase",async()=>{
    const fetchImpl=vi.fn();
    const runtime=createHyperAppRuntimeAssembly(config(fetchImpl));
    expect(runtime.productionEligible).toBe(false);
    expect(runtime.path).toBe("/api/xsus-app/hyper/evidence/verify");
    expect((await request(runtime)).status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects invalid bearer identity before ownership lookup",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:false}));
    const runtime=createHyperAppRuntimeAssembly(config(fetchImpl,true));
    expect((await request(runtime)).status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("denies access when owner mapping is absent; never reads evidence",async()=>{
    const fetchImpl=vi.fn(async url=>{
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      if(url.includes("/hyper_evidence_owners")) return {ok:true,json:async()=>([])};
      throw Error("Evidence storage must not be reached");
    });
    const runtime=createHyperAppRuntimeAssembly(config(fetchImpl,true));
    expect((await request(runtime)).status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("refuses client-side evidence.store before ownership lookup",async()=>{
    const fetchImpl=vi.fn(async url=>{
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      throw Error("Unexpected Supabase request");
    });
    const runtime=createHyperAppRuntimeAssembly(config(fetchImpl,true));
    expect((await request(runtime,{action:"evidence.store",observationId:OBS})).status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("checks ownership before evidence read; missing evidence fails closed",async()=>{
    const calls=[];
    const fetchImpl=vi.fn(async url=>{
      calls.push(url);
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      if(url.includes("/hyper_evidence_owners")) return {ok:true,json:async()=>[{user_id:USER,observation_id:OBS}]};
      if(url.includes("/hyper_runtime_evidence_bundles")) return {ok:true,json:async()=>[]};
      throw Error("Unexpected URL");
    });
    const runtime=createHyperAppRuntimeAssembly(config(fetchImpl,true));
    const result=await request(runtime);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ok:false,code:"VERIFICATION_UNAVAILABLE"});
    expect(calls).toHaveLength(3);
    expect(calls[0]).toContain("/auth/v1/user");
    expect(calls[1]).toContain("/hyper_evidence_owners");
    expect(calls[2]).toContain("/hyper_runtime_evidence_bundles");
    expect(fetchImpl.mock.calls.every(([,opts])=>opts.method==="GET")).toBe(true);
  });
});
