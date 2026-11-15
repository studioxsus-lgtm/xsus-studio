import {describe,it,expect,vi} from "vitest";
import {createHyperAppBackendComposition as create} from "./hyper-v8234-backend-composition.js";
const base={
  supabaseUrl:"https://example.supabase.co",
  publishableKey:"test-publishable-key",
  serviceRoleKey:"test-service-key",
  evidenceKey:Buffer.alloc(32, 0xa5),evidenceKeyId:"test-key",
  authorizeEvidenceOwner:async()=>false,
  fetchImpl:vi.fn()
};
const request={method:"POST",headers:{
  authorization:"Bearer "+"a".repeat(32),
  "content-type":"application/json"
},rawBody:JSON.stringify({action:"evidence.verify",observationId:"obs_1"})};
describe("Hyper v8.2.34 backend composition",()=>{
  it("requires ownership callback",()=>{
    expect(()=>create({...base,authorizeEvidenceOwner:null})).toThrow();
  });
  it("starts disabled",async()=>{
    const app=create(base);
    expect((await app.handle(request)).status).toBe(503);
    expect(base.fetchImpl).not.toHaveBeenCalled();
  });
  it("does not expose secrets",()=>{
    const app=create(base);
    expect(JSON.stringify(app)).not.toContain(base.serviceRoleKey);
    expect(JSON.stringify(app)).not.toContain(base.evidenceKey);
    expect(app.productionEligible).toBe(false);
  });
  it("rejects missing bearer token before storage",async()=>{
    const fetchImpl=vi.fn();
    const app=create({...base,fetchImpl,enabled:true});
    expect((await app.handle({...request,headers:{"content-type":"application/json"}})).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects invalid Supabase identity",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:false,status:401}));
    const app=create({...base,fetchImpl,enabled:true});
    expect((await app.handle(request)).status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("rejects unowned evidence without reading storage",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:"550e8400-e29b-41d4-a716-446655440000"})}));
    const authorizeEvidenceOwner=vi.fn(async()=>false);
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    expect((await app.handle(request)).status).toBe(403);
    expect(authorizeEvidenceOwner).toHaveBeenCalledWith({
      userId:"550e8400-e29b-41d4-a716-446655440000",observationId:"obs_1"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("rejects client evidence.store",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:"550e8400-e29b-41d4-a716-446655440000"})}));
    const app=create({...base,fetchImpl,enabled:true});
    const result=await app.handle({...request,rawBody:JSON.stringify({action:"evidence.store"})});
    expect(result.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("fails closed on ownership errors",async()=>{
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:"550e8400-e29b-41d4-a716-446655440000"})}));
    const app=create({...base,fetchImpl,enabled:true,
      authorizeEvidenceOwner:async()=>{throw Error("private");}});
    const result=await app.handle(request);
    expect(result.status).toBe(403);
    expect(JSON.stringify(result)).not.toContain("private");
  });
});
