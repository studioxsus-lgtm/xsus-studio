import {describe,it,expect,vi} from "vitest";
import {createBuildPipeline} from "../../src/xsus-app-build-engine/integration/build-pipeline.js";
import {createSandboxRunner} from "../../src/xsus-app-build-engine/sandbox/sandbox-runner.js";
import {createSandboxVerification} from "../../src/xsus-app-build-engine/integration/sandbox-verification.js";
const preparedPromise=()=>createBuildPipeline().prepare({prompt:"Build a dashboard",projectId:"demo-app"},{id:"job-0003"});
describe("XSUS phase 24 sandbox verification boundary",()=>{
  it("rejects missing runner",()=>expect(()=>createSandboxVerification()).toThrow("runner"));
  it("rejects fabricated approved builds",async()=>{const gate=createSandboxVerification({runner:{run:vi.fn()}});await expect(gate.inspect({status:"ready",productionApproved:true})).rejects.toThrow("Untrusted");});
  it("blocks the current declarative sandbox provider",async()=>{const prepared=await preparedPromise();const runner=createSandboxRunner({provider:{execute:async()=>({success:true,diagnostics:[]})}});const result=await createSandboxVerification({runner}).inspect(prepared);expect(result.passed).toBe(false);expect(result.blockers).toContain("isolation-unverified");});
  it("blocks a failed isolated execution",async()=>{const prepared=await preparedPromise();const runner={run:async()=>({project:"demo-app",success:false,verifiedIsolation:true,diagnostics:[]})};const result=await createSandboxVerification({runner}).inspect(prepared);expect(result.blockers).toContain("sandbox-execution");});
  it("blocks isolation with mismatched project identity",async()=>{const prepared=await preparedPromise();const runner={run:async()=>({project:"wrong-app",success:true,verifiedIsolation:true,diagnostics:[]})};const result=await createSandboxVerification({runner}).inspect(prepared);expect(result.passed).toBe(false);});
  it("blocks error diagnostics",async()=>{const prepared=await preparedPromise();const runner={run:async()=>({project:"demo-app",success:true,verifiedIsolation:true,diagnostics:[{level:"error",message:"failure"}]})};expect((await createSandboxVerification({runner}).inspect(prepared)).passed).toBe(false);});
  it("rejects cancelled operations before calling provider",async()=>{const prepared=await preparedPromise();const run=vi.fn();await expect(createSandboxVerification({runner:{run}}).inspect(prepared,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(run).not.toHaveBeenCalled();});
  it("never grants release approval even for an attested result",async()=>{const prepared=await preparedPromise();const runner={run:async()=>({project:"demo-app",success:true,verifiedIsolation:true,diagnostics:[]})};const result=await createSandboxVerification({runner}).inspect(prepared);expect(result.passed).toBe(true);expect(result.productionApproved).toBe(false);});
});
