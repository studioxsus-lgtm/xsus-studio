import {describe,it,expect,vi} from "vitest";
import {createHyperOwnedEvidenceService} from "./hyper-owned-evidence-service.js";
const principal={verified:true,source:"server-verified-principal",
 userId:"550e8400-e29b-41d4-a716-446655440000"};
const input={observationId:"obs-1",serviceId:"xsus-app",snapshot:{
 instanceId:"instance-1234",processId:42,
 startedAt:"2026-11-15T00:00:00.000Z",
 observedAt:"2026-11-15T00:00:01.000Z",
 source:"local-process-observation"}};
const make=(fetchImpl,enabled=true)=>createHyperOwnedEvidenceService({
 url:"https://example.supabase.co",serviceRoleKey:"server-secret",
 key:Buffer.alloc(32,7),keyId:"key-v1",fetchImpl,enabled
});
describe("Hyper owned evidence internal service",()=>{
 it("signs and provisions evidence and owner in a single RPC",async()=>{
  const fetchImpl=vi.fn(async()=>({ok:true,json:async()=> "obs-1"}));
  const result=await make(fetchImpl).create({input,verifiedPrincipal:principal});
  expect(result).toEqual({stored:true,observationId:"obs-1"});
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url,options]=fetchImpl.mock.calls[0];
  expect(url).toContain("/rpc/hyper_insert_owned_evidence");
  const body=JSON.parse(options.body);
  expect(body.p_user_id).toBe(principal.userId);
  expect(body.p_bundle.authentication_tag).toMatch(/^[a-f0-9]{64}$/);
  expect(body.p_bundle.evidence_digest).toMatch(/^[a-f0-9]{64}$/);
  expect(body.p_bundle.observation_id).toBe("obs-1");
 });
 it("denies unverified identity without network calls",async()=>{
  const fetchImpl=vi.fn();
  const result=await make(fetchImpl).create({input,verifiedPrincipal:{...principal,verified:false}});
  expect(result.reason).toBe("UNVERIFIED_PRINCIPAL");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("denies invalid observations before network calls",async()=>{
  const fetchImpl=vi.fn();
  const result=await make(fetchImpl).create({input:{...input,observationId:"!"},verifiedPrincipal:principal});
  expect(result.reason).toBe("INVALID_EVIDENCE");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("fails closed when database transaction fails",async()=>{
  const fetchImpl=vi.fn(async()=>({ok:false}));
  const result=await make(fetchImpl).create({input,verifiedPrincipal:principal});
  expect(result.reason).toBe("ATOMIC_PROVISIONING_FAILED");
 });
 it("remains disabled by default",async()=>{
  const fetchImpl=vi.fn();
  const result=await make(fetchImpl,false).create({input,verifiedPrincipal:principal});
  expect(result.reason).toBe("SERVICE_DISABLED");
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects RPC response with a different observation ID",async()=>{
  const fetchImpl=vi.fn(async()=>({ok:true,json:async()=> "other-id"}));
  const result=await make(fetchImpl).create({input,verifiedPrincipal:principal});
  expect(result).toEqual({stored:false,reason:"ATOMIC_PROVISIONING_FAILED"});
 });
 it("fails closed if RPC returns invalid JSON",async()=>{
  const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>{throw Error("invalid JSON");}}));
  const result=await make(fetchImpl).create({input,verifiedPrincipal:principal});
  expect(result.reason).toBe("ATOMIC_PROVISIONING_FAILED");
 });
 it("rejects a principal without trusted marker",async()=>{
  const fetchImpl=vi.fn();
  const result=await make(fetchImpl).create({input,verifiedPrincipal:{verified:true,userId:principal.userId}});
  expect(result.reason).toBe("UNVERIFIED_PRINCIPAL");
  expect(fetchImpl).not.toHaveBeenCalled();
 });

});
