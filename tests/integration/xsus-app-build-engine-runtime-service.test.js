import {describe,it,expect,vi} from "vitest";
import {createRuntimeService} from "../../src/xsus-app-build-engine/sandbox/runtime-service.js";
const manifest={project:"demo-app",files:[{path:"index.html",content:"<!doctype html><title>Demo</title>"}]};
const request={version:"0.1.0",manifest,executionId:"execution-0001",artifactDigest:"a".repeat(64),policy:{network:"disabled",filesystem:"ephemeral",privileged:false}};
const executor={runIsolated:async()=>({success:true,diagnostics:[],proof:{signature:"placeholder"}})};
const make=(overrides={})=>createRuntimeService({authorize:async()=>true,executor,hash:async()=>"a".repeat(64),verifyExecutionProof:async()=>false,...overrides});
describe("XSUS phase 28 runtime service boundary",()=>{
  it("requires an isolated executor",()=>expect(()=>createRuntimeService({authorize:async()=>true,hash:async()=>"",verifyExecutionProof:async()=>true})).toThrow("executor"));
  it("rejects unauthenticated execution before running",async()=>{const runIsolated=vi.fn();await expect(make({authorize:async()=>false,executor:{runIsolated}}).execute(request)).rejects.toThrow("authorization");expect(runIsolated).not.toHaveBeenCalled();});
  it("rejects artifact digest mismatch",async()=>await expect(make({hash:async()=>"b".repeat(64)}).execute(request)).rejects.toThrow("integrity"));
  it("rejects attempts to enable networking",async()=>await expect(make().execute({...request,policy:{network:"enabled"}})).rejects.toThrow("Network"));
  it("rejects privileged execution",async()=>await expect(make().execute({...request,policy:{privileged:true}})).rejects.toThrow("Privileged"));
  it("rejects invalid policy version",async()=>await expect(make().execute({...request,policy:{version:"9.0.0"}})).rejects.toThrow("version"));
  it("rejects missing isolation proof",async()=>await expect(make({executor:{runIsolated:async()=>({success:true,diagnostics:[]})}}).execute(request)).rejects.toThrow("proof"));
  it("rejects unverified isolation proof",async()=>await expect(make().execute(request)).rejects.toThrow("proof"));
  it("returns verified executor result without approving production",async()=>{const result=await make({verifyExecutionProof:async()=>true}).execute(request);expect(result.success).toBe(true);expect(result.productionApproved).toBe(false);});
  it("blocks cancelled operations before running",async()=>{const runIsolated=vi.fn();await expect(make({executor:{runIsolated}}).execute(request,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(runIsolated).not.toHaveBeenCalled();});
});
