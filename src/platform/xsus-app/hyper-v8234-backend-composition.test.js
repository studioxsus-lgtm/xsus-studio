import {describe,it,expect,vi} from "vitest";
import {createHyperAppBackendComposition as create} from "./hyper-v8234-backend-composition.js";
import {createHyperEvidenceProvenance} from "./hyper-v8222-evidence-provenance.js";
import {createHyperEvidenceOwnerAuthorizer} from "./hyper-evidence-owner-authorizer.js";
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
  it("allows storage read only after verified identity and ownership",async()=>{
    const userId="550e8400-e29b-41d4-a716-446655440000";
    const fetchImpl=vi.fn(async(url)=>{
      if (String(url).endsWith("/auth/v1/user"))
        return {ok:true,json:async()=>({id:userId})};
      return {ok:false,status:404,json:async()=>({})};
    });
    const authorizeEvidenceOwner=vi.fn(async()=>true);
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    const result=await app.handle(request);
    expect(result.status).toBe(503);
    expect(result.body.code).toBe("VERIFICATION_UNAVAILABLE");
    expect(authorizeEvidenceOwner).toHaveBeenCalledWith({userId,observationId:"obs_1"});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain("hyper_runtime_evidence_bundles");
    expect(JSON.stringify(result)).not.toContain(base.serviceRoleKey);
  });
  it("never trusts a userId supplied in the request body",async()=>{
    const userId="550e8400-e29b-41d4-a716-446655440000";
    const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>({id:userId})}));
    const authorizeEvidenceOwner=vi.fn(async()=>false);
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    const forged={...request,rawBody:JSON.stringify({
      action:"evidence.verify",observationId:"obs_1",
      userId:"11111111-1111-4111-8111-111111111111",role:"service_role"
    })};
    const result=await app.handle(forged);
    expect(result.status).toBe(403);
    expect(authorizeEvidenceOwner).toHaveBeenCalledWith({userId,observationId:"obs_1"});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("verifies a valid signed atomic evidence bundle end to end",async()=>{
    const userId="550e8400-e29b-41d4-a716-446655440000";
    const input={
      observationId:"obs_1",serviceId:"xsus-studio",
      snapshot:{
        instanceId:"instance-1234",processId:123,
        startedAt:"2026-11-15T09:00:00.000Z",
        observedAt:"2026-11-15T09:01:00.000Z",
        source:"local-process-observation"
      }
    };
    const envelope=createHyperEvidenceProvenance({
      key:base.evidenceKey,keyId:base.evidenceKeyId
    }).sign(input);
    const record={
      observation_id:input.observationId,service_id:input.serviceId,
      instance_id:input.snapshot.instanceId,process_id:input.snapshot.processId,
      started_at:input.snapshot.startedAt,observed_at:input.snapshot.observedAt,
      source:input.snapshot.source,envelope_version:envelope.version,
      envelope_algorithm:envelope.algorithm,envelope_key_id:envelope.keyId,
      evidence_digest:envelope.evidenceDigest,authentication_tag:envelope.authenticationTag
    };
    const fetchImpl=vi.fn(async(url)=>{
      if (String(url).endsWith("/auth/v1/user"))
        return {ok:true,json:async()=>({id:userId})};
      return {ok:true,json:async()=>[record]};
    });
    const authorizeEvidenceOwner=vi.fn(async()=>true);
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    const result=await app.handle(request);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok:true,verified:true,observationId:"obs_1",
      runtimeAttested:false,productionEligible:false
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(authorizeEvidenceOwner).toHaveBeenCalledWith({userId,observationId:"obs_1"});
  });
  it("rejects tampered signed evidence after authentication and ownership",async()=>{
    const userId="550e8400-e29b-41d4-a716-446655440000";
    const input={
      observationId:"obs_1",serviceId:"xsus-studio",
      snapshot:{
        instanceId:"instance-1234",processId:123,
        startedAt:"2026-11-15T09:00:00.000Z",
        observedAt:"2026-11-15T09:01:00.000Z",
        source:"local-process-observation"
      }
    };
    const envelope=createHyperEvidenceProvenance({
      key:base.evidenceKey,keyId:base.evidenceKeyId
    }).sign(input);
    const record={
      observation_id:input.observationId,service_id:input.serviceId,
      instance_id:input.snapshot.instanceId,process_id:999,
      started_at:input.snapshot.startedAt,observed_at:input.snapshot.observedAt,
      source:input.snapshot.source,envelope_version:envelope.version,
      envelope_algorithm:envelope.algorithm,envelope_key_id:envelope.keyId,
      evidence_digest:envelope.evidenceDigest,authentication_tag:envelope.authenticationTag
    };
    const fetchImpl=vi.fn(async(url)=>{
      if(String(url).endsWith("/auth/v1/user"))
        return {ok:true,json:async()=>({id:userId})};
      return {ok:true,json:async()=>[record]};
    });
    const authorizeEvidenceOwner=vi.fn(async()=>true);
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    const result=await app.handle(request);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ok:false,code:"VERIFICATION_UNAVAILABLE"});
    expect(authorizeEvidenceOwner).toHaveBeenCalledWith({userId,observationId:"obs_1"});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("uses the actual Supabase owner authorizer and denies mismatched ownership before evidence reads",async()=>{
    const userId="550e8400-e29b-41d4-a716-446655440000";
    const otherUser="11111111-1111-4111-8111-111111111111";
    const fetchImpl=vi.fn(async(url)=>{
      const target=String(url);
      if(target.endsWith("/auth/v1/user"))
        return {ok:true,json:async()=>({id:userId})};
      if(target.includes("/rest/v1/hyper_evidence_owners"))
        return {ok:true,json:async()=>[{user_id:otherUser,observation_id:"obs_1"}]};
      throw Error("evidence storage must not be read");
    });
    const authorizeEvidenceOwner=createHyperEvidenceOwnerAuthorizer({
      url:base.supabaseUrl,serviceRoleKey:base.serviceRoleKey,fetchImpl
    });
    const app=create({...base,fetchImpl,authorizeEvidenceOwner,enabled:true});
    const result=await app.handle(request);
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ok:false,code:"FORBIDDEN"});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1][0])).toContain("hyper_evidence_owners");
  });
});
