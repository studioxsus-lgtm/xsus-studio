import {describe,it,expect,vi} from "vitest";
import {validateBuildManifest} from "../../src/xsus-app-build-engine/build/build-manifest.js";
import {createBuildExecutor} from "../../src/xsus-app-build-engine/build/build-executor.js";
const manifest={project:"my-app",files:[{path:"index.html",content:"<!doctype html>"}]};
describe("XSUS build and execution contracts",()=>{
  it("validates a generated app manifest",()=>{const result=validateBuildManifest(manifest);expect(result.files[0].path).toBe("index.html");expect(Object.isFrozen(result.files)).toBe(true);});
  it("rejects traversal paths",()=>{expect(()=>validateBuildManifest({...manifest,files:[{path:"../index.html",content:"x"}]})).toThrow("Unsafe");});
  it("rejects duplicate paths",()=>{expect(()=>validateBuildManifest({...manifest,files:[...manifest.files,...manifest.files]})).toThrow("Duplicate");});
  it("requires entry point",()=>{expect(()=>validateBuildManifest({...manifest,files:[{path:"main.js",content:""}]})).toThrow("index.html");});
  it("delegates to a trusted injected runner",async()=>{const runner=vi.fn(async()=>({success:true,diagnostics:[]}));const result=await createBuildExecutor({runner}).execute(manifest);expect(result.success).toBe(true);expect(runner).toHaveBeenCalledOnce();});
  it("rejects malformed runner output",async()=>{const runner=async()=>({success:"yes",diagnostics:[]});await expect(createBuildExecutor({runner}).execute(manifest)).rejects.toThrow("runner");});
  it("refuses execution without an isolated runner",()=>{expect(()=>createBuildExecutor()).toThrow("runner");});
  it("honors cancellation before execution",async()=>{const runner=vi.fn();await expect(createBuildExecutor({runner}).execute(manifest,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(runner).not.toHaveBeenCalled();});
});
