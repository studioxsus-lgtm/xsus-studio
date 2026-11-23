import {describe,it,expect,vi} from "vitest";
import {createDockerRuntimeIntegration} from "../../src/xsus-app-build-engine/sandbox/docker-runtime-integration.js";
const image="xsus/runtime@sha256:"+"a".repeat(64);
const executionId="execution-0001",operationId="operation-0001";
function setup(){
 const runProcess=vi.fn(async()=>({exitCode:0})),materialize=vi.fn(async()=>({path:"/var/lib/xsus-sandbox/staging/"+executionId,verifiedPermissions:true})),removeMaterialized=vi.fn(async()=>{}),verifyHostIsolation=vi.fn(async()=>true),requestStop=vi.fn(async()=>{}),recordUncertain=vi.fn(async()=>{});
 const api=createDockerRuntimeIntegration({image,runProcess,materialize,removeMaterialized,verifyHostIsolation,requestStop,recordUncertain});
 return {api,runProcess,materialize,removeMaterialized,verifyHostIsolation,requestStop,recordUncertain};
}
describe("XSUS phase 62 Docker runtime integration",()=>{
 it("rejects missing trusted dependencies",()=>expect(()=>createDockerRuntimeIntegration()).toThrow());
 it("rejects invalid execution identity",async()=>await expect(setup().api.execute({executionId:"bad",operationId})).rejects.toThrow("identity"));
 it("rejects invalid operation identity",async()=>await expect(setup().api.execute({executionId,operationId:"bad"})).rejects.toThrow("identity"));
 it("rejects missing manifest",async()=>await expect(setup().api.execute({executionId,operationId})).rejects.toThrow());
 it("does not run Docker with missing manifest",async()=>{const x=setup();await expect(x.api.execute({executionId,operationId})).rejects.toThrow();expect(x.runProcess).not.toHaveBeenCalled();});
 it("does not stage invalid manifest",async()=>{const x=setup();await expect(x.api.execute({executionId,operationId,manifest:{}})).rejects.toThrow();expect(x.materialize).not.toHaveBeenCalled();});
 it("does not call host verifier for missing manifest",async()=>{const x=setup();await expect(x.api.execute({executionId,operationId})).rejects.toThrow();expect(x.verifyHostIsolation).not.toHaveBeenCalled();});
 it("rejects pre-aborted signal",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.api.execute({executionId,operationId,signal:controller.signal})).rejects.toThrow("before start");});
 it("rejects invalid cancellation timeout",async()=>await expect(setup().api.execute({executionId,operationId,timeoutMs:0})).rejects.toThrow("Invalid"));
 it("does not request stop for validation errors",async()=>{const x=setup();await expect(x.api.execute({executionId,operationId})).rejects.toThrow();expect(x.requestStop).not.toHaveBeenCalled();});
 it("does not record uncertain for ordinary validation errors",async()=>{const x=setup();await expect(x.api.execute({executionId,operationId})).rejects.toThrow();expect(x.recordUncertain).not.toHaveBeenCalled();});
 it("validates digest-pinned image",()=>expect(()=>createDockerRuntimeIntegration({image:"latest"})).toThrow());
});
