import {describe,it,expect,vi} from "vitest";
import {createFullSystemBuildIntegration} from "../../src/xsus-app-build-engine/integration/full-system-build-integration.js";
const request={ownerId:"owner-0001",projectId:"project-0001",executionId:"execution-0001",operationId:"operation-0001",prompt:"Create a notes app"};
const architecture={name:"Notes",slug:"notes-app",modules:[{id:"home",kind:"page"}],routes:[{id:"homeRoute",path:"/",moduleId:"home"}]};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function setup(options={}){const authorize=vi.fn(async()=>true),planner=vi.fn(async()=>architecture),runtime={execute:vi.fn(async()=>({success:true,diagnostics:[]}))},recordResult=vi.fn(async()=>{});return {api:createFullSystemBuildIntegration({authorize,planner,runtime,recordResult,...options}),authorize,planner,runtime,recordResult};}
describe("XSUS phase 68 full system integration",()=>{
 it("composes complete project-to-result pipeline",async()=>{const x=setup();expect((await x.api.build(request)).status).toBe("succeeded");expect(x.runtime.execute).toHaveBeenCalledTimes(1);expect(x.recordResult).toHaveBeenCalledWith(expect.objectContaining({status:"succeeded"}));});
 it("enforces security policy at runtime",async()=>{const x=setup();await x.api.build(request);expect(x.runtime.execute.mock.calls[0][0].policy).toMatchObject({network:"disabled",privileged:false});});
 it("rejects missing identity",async()=>await expect(setup().api.build({...request,executionId:""})).rejects.toThrow("identity"));
 it("rejects malformed operation identity",async()=>await expect(setup().api.build({...request,operationId:"../bad"})).rejects.toThrow("identity"));
 it("rejects unauthorized builds",async()=>{const x=setup();x.authorize.mockResolvedValue(false);await expect(x.api.build(request)).rejects.toThrow("unauthorized");expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("blocks duplicate in-flight operation",async()=>{const gate=deferred(),x=setup();x.runtime.execute.mockImplementation(()=>gate.promise);const first=x.api.build(request);await expect(x.api.build(request)).rejects.toThrow("already in progress");gate.resolve({success:true,diagnostics:[]});await first;expect(x.runtime.execute).toHaveBeenCalledTimes(1);});
 it("releases operation identity after success",async()=>{const x=setup();await x.api.build(request);await x.api.build(request);expect(x.runtime.execute).toHaveBeenCalledTimes(2);});
 it("releases operation identity after failure",async()=>{const x=setup();x.runtime.execute.mockRejectedValueOnce(new Error("lost host"));await expect(x.api.build(request)).rejects.toThrow("lost host");await expect(x.api.build(request)).resolves.toMatchObject({status:"succeeded"});});
 it("isolates distinct operation identities",async()=>{const gate=deferred(),x=setup({maxActive:2});x.runtime.execute.mockImplementation(()=>gate.promise);const a=x.api.build(request),b=x.api.build({...request,operationId:"operation-0002"});expect(x.api.snapshot().inFlight).toBe(2);gate.resolve({success:true,diagnostics:[]});await Promise.all([a,b]);});
 it("bounds active work and queues",async()=>{const gate=deferred(),x=setup({maxActive:1,maxQueued:1});x.runtime.execute.mockImplementation(()=>gate.promise);const first=x.api.build(request),second=x.api.build({...request,operationId:"operation-0002"});await expect(x.api.build({...request,operationId:"operation-0003"})).rejects.toThrow("queue full");gate.resolve({success:true,diagnostics:[]});await Promise.all([first,second]);});
 it("reports immutable metrics",()=>expect(Object.isFrozen(setup().api.snapshot())).toBe(true));
 it("rejects unsafe requested resource policy",async()=>{const x=setup();await expect(x.api.build({...request,policy:{memoryMb:999}})).rejects.toThrow();expect(x.runtime.execute).not.toHaveBeenCalled();});
 it("preserves runtime failure status",async()=>{const x=setup();x.runtime.execute.mockResolvedValue({success:false,diagnostics:[]});expect((await x.api.build(request)).status).toBe("failed");});
 it("does not expose generated source",async()=>{const x=setup();const result=await x.api.build(request);expect(result).not.toHaveProperty("manifest");});
});
