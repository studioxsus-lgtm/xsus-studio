import {describe,it,expect,vi} from "vitest";
import {createSandboxPolicy} from "../../src/xsus-app-build-engine/sandbox/sandbox-policy.js";
import {createSandboxRunner} from "../../src/xsus-app-build-engine/sandbox/sandbox-runner.js";
const app={project:"demo-app",files:[{path:"index.html",content:"<!doctype html>"}]};
describe("XSUS sandbox execution contracts",()=>{
  it("defaults to restricted policy",()=>{const p=createSandboxPolicy();expect(p.network).toBe("disabled");expect(p.privileged).toBe(false);expect(Object.isFrozen(p)).toBe(true);});
  it("rejects excessive memory",()=>{expect(()=>createSandboxPolicy({memoryMb:512})).toThrow("maximum");});
  it("rejects unknown policy keys",()=>{expect(()=>createSandboxPolicy({network:"enabled"})).toThrow("Unsupported");});
  it("requires an injected sandbox provider",()=>{expect(()=>createSandboxRunner()).toThrow("provider");});
  it("delegates manifest and policy to provider",async()=>{const execute=vi.fn(async()=>({success:true,diagnostics:[]}));const result=await createSandboxRunner({provider:{execute}}).run(app);expect(execute).toHaveBeenCalledOnce();expect(result.success).toBe(true);expect(result.verifiedIsolation).toBe(false);});
  it("rejects malformed provider output",async()=>{const runner=createSandboxRunner({provider:{execute:async()=>({success:"yes",diagnostics:[]})}});await expect(runner.run(app)).rejects.toThrow("response");});
  it("refuses cancelled requests before provider call",async()=>{const execute=vi.fn();const runner=createSandboxRunner({provider:{execute}});await expect(runner.run(app,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(execute).not.toHaveBeenCalled();});
  it("validates build paths before delegation",async()=>{const execute=vi.fn();const runner=createSandboxRunner({provider:{execute}});await expect(runner.run({...app,files:[{path:"../escape",content:"x"}]})).rejects.toThrow("Unsafe");expect(execute).not.toHaveBeenCalled();});
});
