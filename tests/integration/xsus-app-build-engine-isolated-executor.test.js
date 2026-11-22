import {describe,it,expect,vi} from "vitest";
import {createIsolatedExecutor} from "../../src/xsus-app-build-engine/sandbox/isolated-executor.js";
const image="xsus/runtime@sha256:"+"a".repeat(64);
const manifest={project:"demo-app",files:[{path:"index.html",content:"<!doctype html><title>Demo</title>"}]};
const args={manifest,policy:{network:"disabled",filesystem:"ephemeral",privileged:false},executionId:"execution-0001"};
const driver={run:async()=>({success:true,diagnostics:[]})};
const make=(overrides={})=>createIsolatedExecutor({driver,image,verifyHostIsolation:async()=>false,...overrides});
describe("XSUS phase 29 isolated executor boundary",()=>{
  it("requires an isolated driver",()=>expect(()=>createIsolatedExecutor({image,verifyHostIsolation:async()=>true})).toThrow("driver"));
  it("requires a digest-pinned image",()=>expect(()=>createIsolatedExecutor({driver,image:"latest",verifyHostIsolation:async()=>true})).toThrow("image"));
  it("requires host isolation verification",()=>expect(()=>createIsolatedExecutor({driver,image})).toThrow("verifier"));
  it("refuses unverified host isolation",async()=>{const run=vi.fn();await expect(make({driver:{run}}).runIsolated(args)).rejects.toThrow("Host isolation");expect(run).not.toHaveBeenCalled();});
  it("rejects network enablement",async()=>await expect(make().runIsolated({...args,policy:{network:"enabled"}})).rejects.toThrow("Network"));
  it("rejects privileged execution",async()=>await expect(make().runIsolated({...args,policy:{privileged:true}})).rejects.toThrow("Privileged"));
  it("passes restrictive specifications to the driver",async()=>{const run=vi.fn(async()=>({success:true,diagnostics:[]}));await make({driver:{run},verifyHostIsolation:async()=>true}).runIsolated(args);expect(run.mock.calls[0][0]).toMatchObject({network:"none",readOnlyRootfs:true,privileged:false,noNewPrivileges:true,dropCapabilities:"ALL",pidsLimit:32});});
  it("never fabricates isolation proof",async()=>{const result=await make({verifyHostIsolation:async()=>true}).runIsolated(args);expect(result.proof).toBe(null);});
  it("preserves driver proof for independent verification",async()=>{const proof={signed:"opaque"};const result=await make({verifyHostIsolation:async()=>true,driver:{run:async()=>({success:true,diagnostics:[],proof})}}).runIsolated(args);expect(result.proof).toBe(proof);});
  it("blocks cancelled execution before driver invocation",async()=>{const run=vi.fn();await expect(make({driver:{run},verifyHostIsolation:async()=>true}).runIsolated({...args,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(run).not.toHaveBeenCalled();});
});
