import { describe, expect, it, vi } from "vitest";
import { createHyperAtomicBundleTransport } from "./hyper-v8225-atomic-bundle-transport.js";
const row = {
  observation_id:"obs_1", service_id:"srv_example", instance_id:"instance-one",
  process_id:101, started_at:"2026-11-14T10:00:00Z",
  observed_at:"2026-11-14T10:01:00Z", source:"local-process-observation",
  envelope_version:1, envelope_algorithm:"HMAC-SHA256",
  envelope_key_id:"key1", evidence_digest:"a".repeat(64),
  authentication_tag:"b".repeat(64)
};
const bundle = () => ({
  row: Object.fromEntries(Object.entries(row).filter(([k]) =>
    !["envelope_version","envelope_algorithm","envelope_key_id",
       "evidence_digest","authentication_tag"].includes(k))),
  envelope: {version:1,algorithm:"HMAC-SHA256",keyId:"key1",
    evidenceDigest:"a".repeat(64),authenticationTag:"b".repeat(64)}
});
const make = response => createHyperAtomicBundleTransport({
  url:"https://example.supabase.co",serviceRoleKey:"test-key",enabled:true,
  fetchImpl:vi.fn(async()=>({ok:true,json:async()=>[response]}))
});
describe("Hyper v8.2.29 atomic write confirmation regressions",()=>{
  it("accepts a fully matching persisted row",async()=>{
    expect((await make({...row}).insertBundle(bundle())).inserted).toBe(true);
  });
  it("accepts equivalent PostgreSQL timezone serialization",async()=>{
    const returned={...row,started_at:"2026-11-14T11:00:00+01:00"};
    expect((await make(returned).insertBundle(bundle())).inserted).toBe(true);
  });
  it("rejects changed service identity",async()=>{
    await expect(make({...row,service_id:"srv_other"}).insertBundle(bundle()))
      .rejects.toThrow("write failed");
  });
  it("rejects changed process id",async()=>{
    await expect(make({...row,process_id:202}).insertBundle(bundle()))
      .rejects.toThrow("write failed");
  });
  it("rejects changed instance id",async()=>{
    await expect(make({...row,instance_id:"instance-two"}).insertBundle(bundle()))
      .rejects.toThrow("write failed");
  });
  it("rejects changed observed time",async()=>{
    await expect(make({...row,observed_at:"2026-11-14T10:02:00Z"}).insertBundle(bundle()))
      .rejects.toThrow("write failed");
  });
});
