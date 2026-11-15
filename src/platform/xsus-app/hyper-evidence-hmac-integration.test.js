import { describe, expect, it, vi } from "vitest";
import { createHyperTrustedEvidenceStorage } from "./hyper-v8223-trusted-evidence-storage.js";

const KEY = Buffer.alloc(32, 0x41);
const input = Object.freeze({
  observationId: "obs_hmac_1",
  serviceId: "xsus_app",
  snapshot: {
    instanceId: "instance-1234", processId: 123,
    startedAt: "2026-11-15T08:00:00.000Z",
    observedAt: "2026-11-15T08:01:00.000Z",
    source: "local-process-observation"
  }
});
function fixture({tamper,readError=false}={}) {
  let persisted;
  const insertBundle=vi.fn(async bundle=>{
    persisted=structuredClone(bundle);
    return {inserted:true,observationId:bundle.row.observation_id};
  });
  const readBundle=vi.fn(async ()=>{
    if(readError) throw Error("unavailable");
    return tamper ? tamper(structuredClone(persisted)) : structuredClone(persisted);
  });
  const storage=createHyperTrustedEvidenceStorage({
    key:KEY,keyId:"integration-key",insertBundle,readBundle,enabled:true
  });
  return {storage,insertBundle,readBundle};
}
describe("Hyper signed evidence end-to-end storage boundary",()=>{
  it("signs, persists and verifies an untampered atomic bundle",async()=>{
    const {storage,insertBundle}=fixture();
    expect(await storage.store(input)).toEqual({stored:true,observationId:"obs_hmac_1"});
    const bundle=insertBundle.mock.calls[0][0];
    expect(bundle.envelope.algorithm).toBe("HMAC-SHA256");
    expect(bundle.envelope.authenticationTag).toMatch(/^[a-f0-9]{64}$/);
    expect(await storage.readVerified("obs_hmac_1")).toMatchObject({
      verified:true,runtimeAttested:false,productionEligible:false
    });
  });
  it("rejects a modified signed row",async()=>{
    const {storage}=fixture({tamper:bundle=>({...bundle,row:{...bundle.row,process_id:999}})});
    await storage.store(input);
    expect(await storage.readVerified("obs_hmac_1")).toEqual({
      verified:false,reason:"BUNDLE_VERIFICATION_FAILED"
    });
  });
  it("rejects a modified authentication tag",async()=>{
    const {storage}=fixture({tamper:bundle=>({...bundle,envelope:{
      ...bundle.envelope,authenticationTag:"0".repeat(64)
    }})});
    await storage.store(input);
    expect((await storage.readVerified("obs_hmac_1")).verified).toBe(false);
  });
  it("rejects a different key identifier",async()=>{
    const {storage}=fixture({tamper:bundle=>({...bundle,envelope:{
      ...bundle.envelope,keyId:"another-key"
    }})});
    await storage.store(input);
    expect((await storage.readVerified("obs_hmac_1")).verified).toBe(false);
  });
  it("rejects an observation identifier mismatch",async()=>{
    const {storage}=fixture();
    await storage.store(input);
    expect((await storage.readVerified("different_observation")).verified).toBe(false);
  });
  it("fails closed on storage transport failures",async()=>{
    const {storage}=fixture({readError:true});
    await storage.store(input);
    expect(await storage.readVerified("obs_hmac_1")).toEqual({
      verified:false,reason:"BUNDLE_VERIFICATION_FAILED"
    });
  });
  it("rejects a valid signature produced with a different secret",async()=>{
    let persisted;
    const writer=createHyperTrustedEvidenceStorage({
      key:Buffer.alloc(32,0x42),keyId:"integration-key",
      insertBundle:async bundle=>{
        persisted=structuredClone(bundle);
        return {inserted:true,observationId:bundle.row.observation_id};
      },
      readBundle:async()=>persisted,enabled:true
    });
    const verifier=createHyperTrustedEvidenceStorage({
      key:KEY,keyId:"integration-key",
      insertBundle:async()=>({inserted:false}),
      readBundle:async()=>structuredClone(persisted),enabled:true
    });
    expect((await writer.store(input)).stored).toBe(true);
    expect(await verifier.readVerified("obs_hmac_1")).toEqual({
      verified:false,reason:"BUNDLE_VERIFICATION_FAILED"
    });
  });
  it("rejects an altered evidence digest even when the row is unchanged",async()=>{
    const {storage}=fixture({tamper:bundle=>({...bundle,envelope:{
      ...bundle.envelope,evidenceDigest:"f".repeat(64)
    }})});
    await storage.store(input);
    expect((await storage.readVerified("obs_hmac_1")).verified).toBe(false);
  });
  it("never touches storage when disabled",async()=>{
    const insertBundle=vi.fn(),readBundle=vi.fn();
    const storage=createHyperTrustedEvidenceStorage({
      key:KEY,keyId:"integration-key",insertBundle,readBundle
    });
    expect((await storage.store(input)).stored).toBe(false);
    expect((await storage.readVerified("obs_hmac_1")).verified).toBe(false);
    expect(insertBundle).not.toHaveBeenCalled();
    expect(readBundle).not.toHaveBeenCalled();
  });
});
