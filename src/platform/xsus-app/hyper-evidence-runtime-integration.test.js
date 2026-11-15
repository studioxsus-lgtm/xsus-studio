import { describe, it, expect, vi } from "vitest";
import { createHyperAppBackendComposition } from "./hyper-v8234-backend-composition.js";
import { createHyperNodeRuntimeRoute } from "./hyper-v8235-node-runtime-route.js";
import { createHyperEvidenceOwnerAuthorizer } from "./hyper-evidence-owner-authorizer.js";
import { createHyperEvidenceProvenance } from "./hyper-v8222-evidence-provenance.js";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const URL = "https://example.supabase.co";
const TOKEN = "a".repeat(32);
const body = JSON.stringify({action:"evidence.verify",observationId:"obs_1"});
const headers = {authorization:"Bearer "+TOKEN,"content-type":"application/json"};

async function invoke(route,{method="POST",requestHeaders=headers,payload=body}={}) {
  const req = {method,headers:requestHeaders,async *[Symbol.asyncIterator](){
    yield Buffer.from(payload);
  }};
  const res = {writeHead:vi.fn(),end:vi.fn()};
  await route.handle(req,res);
  return {status:res.writeHead.mock.calls[0][0],body:JSON.parse(res.end.mock.calls[0][0])};
}
function setup({owner=USER,authOK=true,ownerOK=true,evidenceRecord=null}={}) {
  const fetchImpl=vi.fn(async (url,options)=>{
    if(url.endsWith("/auth/v1/user"))
      return {ok:authOK,status:authOK?200:401,json:async()=>({id:USER})};
    if(url.includes("/rest/v1/hyper_evidence_owners"))
      return {ok:ownerOK,status:ownerOK?200:403,json:async()=>[
        {user_id:owner,observation_id:"obs_1"}
      ]};
    if(url.includes("/rest/v1/hyper_runtime_evidence_bundles"))
      return evidenceRecord ? {ok:true,status:200,json:async()=>[evidenceRecord]} : {ok:false,status:404,json:async()=>[]};
    throw Error("Unexpected network target");
  });
  const authorizeEvidenceOwner=createHyperEvidenceOwnerAuthorizer({
    url:URL,serviceRoleKey:"server-only-test-key",fetchImpl
  });
  const composition=createHyperAppBackendComposition({
    supabaseUrl:URL,publishableKey:"public-test-key",
    serviceRoleKey:"server-only-test-key",evidenceKey:Buffer.alloc(32, 0x41),
    evidenceKeyId:"test-key",fetchImpl,authorizeEvidenceOwner,enabled:true
  });
  return {route:createHyperNodeRuntimeRoute({composition,enabled:true}),fetchImpl};
}
describe("Hyper evidence runtime full-chain security integration",()=>{
  it("rejects requests when runtime gate is off without network traffic",async()=>{
    const {fetchImpl}=setup();
    const composition={handle:vi.fn()};
    const result=await invoke(createHyperNodeRuntimeRoute({composition}));
    expect(result.status).toBe(503);
    expect(composition.handle).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated requests before any Supabase access",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route,{requestHeaders:{"content-type":"application/json"}});
    expect(result.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects invalid Supabase tokens before ownership lookup",async()=>{
    const {route,fetchImpl}=setup({authOK:false});
    const result=await invoke(route);
    expect(result.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("rejects evidence belonging to another user without reading evidence",async()=>{
    const {route,fetchImpl}=setup({owner:OTHER});
    const result=await invoke(route);
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.some(([url])=>url.includes("hyper_runtime_evidence_bundles"))).toBe(false);
  });
  it("fails closed when ownership REST returns 403",async()=>{
    const {route,fetchImpl}=setup({ownerOK:false});
    const result=await invoke(route);
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("never permits a client to store evidence",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route,{payload:JSON.stringify({action:"evidence.store",observationId:"obs_1"})});
    expect(result.status).toBe(400);
    expect(fetchImpl.mock.calls.some(([,opts])=>opts?.method==="POST")).toBe(false);
  });
  it("ignores a forged userId in the request body and uses the token identity",async()=>{
    const {route,fetchImpl}=setup({owner:OTHER});
    const result=await invoke(route,{payload:JSON.stringify({
      action:"evidence.verify",observationId:"obs_1",userId:OTHER,
      verified:true,role:"service_role"
    })});
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.some(([url])=>url.includes("hyper_runtime_evidence_bundles"))).toBe(false);
  });
  it("rejects malformed JSON before contacting the authentication provider",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route,{payload:"{broken-json"});
    expect(result.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects oversized requests before authentication or evidence access",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route,{payload:"x".repeat(2049)});
    expect(result.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects unsupported methods before any Supabase calls",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route,{method:"GET"});
    expect(result.status).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("authorized user reaches evidence read, but missing evidence cannot be verified",async()=>{
    const {route,fetchImpl}=setup();
    const result=await invoke(route);
    expect(result.status).not.toBe(200);
    expect(fetchImpl.mock.calls.some(([url,opts])=>
      url.includes("/rest/v1/hyper_runtime_evidence_bundles")&&opts?.method==="GET")).toBe(true);
    expect(fetchImpl.mock.calls.some(([,opts])=>opts?.method==="POST")).toBe(false);
  });
  it("verifies signed evidence through Node HTTP, Supabase auth, real owner lookup and storage",async()=>{
    const input={observationId:"obs_1",serviceId:"xsus-studio",snapshot:{
      instanceId:"instance-1234",processId:123,
      startedAt:"2026-11-15T09:00:00.000Z",
      observedAt:"2026-11-15T09:01:00.000Z",
      source:"local-process-observation"
    }};
    const envelope=createHyperEvidenceProvenance({
      key:Buffer.alloc(32,0x41),keyId:"test-key"
    }).sign(input);
    const evidenceRecord={
      observation_id:input.observationId,service_id:input.serviceId,
      instance_id:input.snapshot.instanceId,process_id:input.snapshot.processId,
      started_at:input.snapshot.startedAt,observed_at:input.snapshot.observedAt,
      source:input.snapshot.source,envelope_version:envelope.version,
      envelope_algorithm:envelope.algorithm,envelope_key_id:envelope.keyId,
      evidence_digest:envelope.evidenceDigest,authentication_tag:envelope.authenticationTag
    };
    const {route,fetchImpl}=setup({evidenceRecord});
    const result=await invoke(route);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok:true,verified:true,observationId:"obs_1",
      runtimeAttested:false,productionEligible:false
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[1][0])).toContain("hyper_evidence_owners");
    expect(String(fetchImpl.mock.calls[2][0])).toContain("hyper_runtime_evidence_bundles");
    expect(fetchImpl.mock.calls.some(([,opts])=>opts?.method==="POST")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("server-only-test-key");
  });
  it("rejects tampered evidence across the complete Node HTTP and Supabase ownership chain",async()=>{
    const input={observationId:"obs_1",serviceId:"xsus-studio",snapshot:{
      instanceId:"instance-1234",processId:123,
      startedAt:"2026-11-15T09:00:00.000Z",
      observedAt:"2026-11-15T09:01:00.000Z",
      source:"local-process-observation"
    }};
    const envelope=createHyperEvidenceProvenance({
      key:Buffer.alloc(32,0x41),keyId:"test-key"
    }).sign(input);
    const evidenceRecord={
      observation_id:input.observationId,service_id:input.serviceId,
      instance_id:input.snapshot.instanceId,process_id:999,
      started_at:input.snapshot.startedAt,observed_at:input.snapshot.observedAt,
      source:input.snapshot.source,envelope_version:envelope.version,
      envelope_algorithm:envelope.algorithm,envelope_key_id:envelope.keyId,
      evidence_digest:envelope.evidenceDigest,authentication_tag:envelope.authenticationTag
    };
    const {route,fetchImpl}=setup({evidenceRecord});
    const result=await invoke(route);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ok:false,code:"VERIFICATION_UNAVAILABLE"});
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.some(([,opts])=>opts?.method==="POST")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("server-only-test-key");
  });
});
