import {describe,it,expect,vi} from "vitest";
import {createDockerContainerDriver} from "../../src/xsus-app-build-engine/sandbox/docker-container-driver.js";
const spec={image:"xsus/runtime@sha256:"+"a".repeat(64),executionId:"execution-0001",network:"none",readOnlyRootfs:true,privileged:false,noNewPrivileges:true,dropCapabilities:"ALL",user:"65534:65534",memoryBytes:268435456,pidsLimit:32,cpus:1,timeoutMs:30000,outputLimitBytes:65536,writableTmpfs:{path:"/tmp",sizeBytes:16777216,noexec:true,nosuid:true,nodev:true},manifest:{project:"demo-app",files:[{path:"index.html",content:"demo"}]}};
const staged={path:"/var/lib/xsus-sandbox/staging/execution-0001",verifiedPermissions:true};
const setup=(extra={})=>{const runProcess=vi.fn(async()=>({exitCode:0}));const materialize=vi.fn(async()=>staged);const removeMaterialized=vi.fn(async()=>{});return {runProcess,materialize,removeMaterialized,driver:createDockerContainerDriver({runProcess,materialize,removeMaterialized,...extra})};};
describe("XSUS phase 30 Docker driver contract",()=>{
  it("requires a process runner",()=>expect(()=>createDockerContainerDriver({materialize:async()=>{},removeMaterialized:async()=>{}})).toThrow("runner"));
  it("rejects network access before staging",async()=>{const x=setup();await expect(x.driver.run({...spec,network:"host"})).rejects.toThrow("Unsafe");expect(x.materialize).not.toHaveBeenCalled();});
  it("rejects writable root filesystems",async()=>await expect(setup().driver.run({...spec,readOnlyRootfs:false})).rejects.toThrow("Unsafe"));
  it("rejects excessive memory",async()=>await expect(setup().driver.run({...spec,memoryBytes:512*1024*1024})).rejects.toThrow("resource"));
  it("requires secure verified staging",async()=>{const x=setup({materialize:async()=>({...staged,verifiedPermissions:false})});await expect(x.driver.run(spec)).rejects.toThrow("staging");expect(x.runProcess).not.toHaveBeenCalled();});
  it("constructs docker arguments without shell interpretation",async()=>{const x=setup();await x.driver.run(spec);const [binary,args,options]=x.runProcess.mock.calls[0];expect(binary).toBe("docker");expect(args).toContain("--network");expect(args).toContain("none");expect(args).toContain("--read-only");expect(args).toContain("--cap-drop");expect(args).toContain("ALL");expect(options.killContainerName).toBe("xsus-execution-0001");});
  it("cleans staged artifacts after successful execution",async()=>{const x=setup();await x.driver.run(spec);expect(x.removeMaterialized).toHaveBeenCalledOnce();});
  it("cleans staged artifacts after runner failure",async()=>{const x=setup({runProcess:async()=>{throw new Error("docker unavailable");}});await expect(x.driver.run(spec)).rejects.toThrow("unavailable");expect(x.removeMaterialized).toHaveBeenCalledOnce();});
  it("does not manufacture attestation",async()=>expect((await setup().driver.run(spec)).proof).toBe(null));
  it("rejects cancelled execution before staging",async()=>{const x=setup();await expect(x.driver.run(spec,{signal:{aborted:true}})).rejects.toThrow("cancelled");expect(x.materialize).not.toHaveBeenCalled();});
});
