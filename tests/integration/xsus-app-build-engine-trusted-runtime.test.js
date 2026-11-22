import {describe,it,expect,vi} from "vitest";
import {createTrustedRuntimeAdapter} from "../../src/xsus-app-build-engine/sandbox/trusted-runtime-adapter.js";
const manifest={project:"demo-app",files:[{path:"index.html",content:"<!doctype html><title>Demo</title>"}]};
const digest=async()=> "a".repeat(64);
const executionId="execution-0001";
const provider={execute:async()=>({success:true,diagnostics:[],attestation:{signed:"placeholder"}})};
const setup=(overrides={})=>createTrustedRuntimeAdapter({provider,digest,verifyAttestation:async()=>false,...overrides});
describe("XSUS phase 25 trusted runtime adapter",()=>{
  it("requires a trusted provider",()=>expect(()=>createTrustedRuntimeAdapter({digest,verifyAttestation:async()=>true})).toThrow("provider"));
  it("requires an attestation verifier",()=>expect(()=>createTrustedRuntimeAdapter({provider,digest})).toThrow("verifier"));
  it("requires a digest provider",()=>expect(()=>createTrustedRuntimeAdapter({provider,verifyAttestation:async()=>true})).toThrow("digest"));
  it("rejects missing execution identity",async()=>await expect(setup().run(manifest)).rejects.toThrow("execution ID"));
  it("fails closed when attestation is not verified",async()=>{const result=await setup().run(manifest,{executionId});expect(result.verifiedIsolation).toBe(false);expect(result.success).toBe(false);});
  it("binds digest project identity and policy to the verifier",async()=>{const verifyAttestation=vi.fn(async()=>true);const result=await setup({verifyAttestation}).run(manifest,{executionId});expect(result.verifiedIsolation).toBe(true);expect(verifyAttestation.mock.calls[0][1]).toMatchObject({project:"demo-app",executionId,artifactDigest:"a".repeat(64),policy:{network:"disabled",privileged:false}});});
  it("rejects invalid digest values",async()=>await expect(setup({digest:async()=>"invalid"}).run(manifest,{executionId})).rejects.toThrow("digest"));
  it("does not call the provider when cancelled",async()=>{const execute=vi.fn();await expect(setup({provider:{execute}}).run(manifest,{executionId,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(execute).not.toHaveBeenCalled();});
  it("never approves production even with verified attestation",async()=>{const result=await setup({verifyAttestation:async()=>true}).run(manifest,{executionId});expect(result.productionApproved).toBe(false);});
});
