import {describe,it,expect,vi} from "vitest";
import {Readable} from "node:stream";
import {createHyperAppRuntimeAssembly} from "../../src/platform/xsus-app/hyper-v8238-runtime-assembly.js";

const USER="11111111-1111-4111-8111-111111111111";
const OTHER="22222222-2222-4222-8222-222222222222";
const OBS="security_check_1";
function setup(fetchImpl,enabled=true) {
  return createHyperAppRuntimeAssembly({
    supabaseUrl:"https://example-project.supabase.co",
    publishableKey:"test-publishable-key",
    serviceRoleKey:"test-service-role-secret",
    evidenceKey:Buffer.alloc(32,9),
    evidenceKeyId:"security-key-v1",
    fetchImpl,enabled
  });
}
async function invoke(runtime,{body={action:"evidence.verify",observationId:OBS},
  method="POST",headers={},chunks}={}) {
  const raw=JSON.stringify(body);
  const req=Readable.from(chunks??[Buffer.from(raw)]);
  req.method=method;
  req.headers={
    authorization:"Bearer valid-provider-token-123456",
    "content-type":"application/json",...headers
  };
  const res={writeHead:vi.fn(),end:vi.fn()};
  await runtime.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],
    body:JSON.parse(res.end.mock.calls[0][0])};
}
describe("Hyper v8.2.39 — runtime security regression gates",()=>{
  it("rejects a malformed content-length before any provider request",async()=>{
    const fetchImpl=vi.fn();
    const result=await invoke(setup(fetchImpl),{headers:{"content-length":"2x"}});
    expect(result.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects oversized streamed input without contacting the provider",async()=>{
    const fetchImpl=vi.fn();
    const result=await invoke(setup(fetchImpl),{chunks:[Buffer.alloc(2049,65)]});
    expect(result.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects forged client userId even when the token resolves to another identity",async()=>{
    const fetchImpl=vi.fn(async url=>{
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      if(url.includes("/hyper_evidence_owners")) return {ok:true,json:async()=>[]};
      throw Error("Evidence read must not happen");
    });
    const result=await invoke(setup(fetchImpl),{
      body:{action:"evidence.verify",observationId:OBS,userId:OTHER}
    });
    expect(result.status).not.toBe(200);
    expect(fetchImpl.mock.calls.some(([url])=>url.includes("/hyper_runtime_evidence_bundles"))).toBe(false);
  });
  it("rejects a duplicate ownership mapping without reading evidence",async()=>{
    const fetchImpl=vi.fn(async url=>{
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      if(url.includes("/hyper_evidence_owners")) return {ok:true,json:async()=>[
        {user_id:USER,observation_id:OBS},{user_id:USER,observation_id:OBS}
      ]};
      throw Error("Evidence read must not happen");
    });
    const result=await invoke(setup(fetchImpl));
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("fails closed on ownership provider outage",async()=>{
    const fetchImpl=vi.fn(async url=>{
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      throw Error("Simulated Supabase outage");
    });
    const result=await invoke(setup(fetchImpl));
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("fails closed on an invalid authenticated user id",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:"attacker"})}));
    const result=await invoke(setup(fetchImpl));
    expect(result.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("does not issue POST, PATCH or DELETE during a verification request",async()=>{
    const methods=[];
    const fetchImpl=vi.fn(async (url,opts)=>{
      methods.push(opts.method);
      if(url.includes("/auth/v1/user")) return {ok:true,json:async()=>({id:USER})};
      if(url.includes("/hyper_evidence_owners")) return {ok:true,json:async()=>[
        {user_id:USER,observation_id:OBS}
      ]};
      if(url.includes("/hyper_runtime_evidence_bundles")) return {ok:true,json:async()=>[]};
      throw Error("Unexpected request");
    });
    const result=await invoke(setup(fetchImpl));
    expect(result.status).toBe(503);
    expect(methods).toEqual(["GET","GET","GET"]);
  });
});
