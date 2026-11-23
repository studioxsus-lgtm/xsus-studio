import {describe,it,expect,vi} from "vitest";
import {createDurableBuildAdmission} from "../../src/xsus-app-build-engine/integration/durable-build-admission.js";
const request={ownerId:"owner-0001",projectId:"project-0001",executionId:"execution-0001",operationId:"operation-0001"};
function setup(){const engine={build:vi.fn(async()=>({status:"succeeded"}))},claimOperation=vi.fn(async()=>({accepted:true,fence:"fence-1"})),recordTerminal=vi.fn(async()=>{});return {engine,claimOperation,recordTerminal,api:createDurableBuildAdmission({engine,claimOperation,recordTerminal})};}
describe("XSUS phase 69 durable admission regression",()=>{
 it("rejects missing dependencies",()=>expect(()=>createDurableBuildAdmission()).toThrow("dependencies"));
 it("requires valid identity",async()=>await expect(setup().api.build({...request,operationId:"bad"})).rejects.toThrow("identity"));
 it("claims before execution",async()=>{const x=setup();await x.api.build(request);expect(x.claimOperation.mock.invocationCallOrder[0]).toBeLessThan(x.engine.build.mock.invocationCallOrder[0]);});
 it("records successful terminal state with fence",async()=>{const x=setup();await x.api.build(request);expect(x.recordTerminal).toHaveBeenCalledWith(expect.objectContaining({fence:"fence-1",status:"succeeded"}));});
 it("rejects replayed operation",async()=>{const x=setup();x.claimOperation.mockResolvedValue({accepted:false});await expect(x.api.build(request)).rejects.toThrow("not admitted");expect(x.engine.build).not.toHaveBeenCalled();});
 it("rejects missing fencing receipt",async()=>{const x=setup();x.claimOperation.mockResolvedValue({accepted:true});await expect(x.api.build(request)).rejects.toThrow("not admitted");});
 it("does not execute on claim failure",async()=>{const x=setup();x.claimOperation.mockRejectedValue(new Error("store unavailable"));await expect(x.api.build(request)).rejects.toThrow("store unavailable");expect(x.engine.build).not.toHaveBeenCalled();});
 it("records uncertain terminal state on execution exception",async()=>{const x=setup();x.engine.build.mockRejectedValue(new Error("host lost"));await expect(x.api.build(request)).rejects.toThrow("host lost");expect(x.recordTerminal).toHaveBeenCalledWith(expect.objectContaining({status:"uncertain"}));});
 it("preserves failed build state",async()=>{const x=setup();x.engine.build.mockResolvedValue({status:"failed"});expect((await x.api.build(request)).status).toBe("failed");expect(x.recordTerminal).toHaveBeenCalledWith(expect.objectContaining({status:"failed"}));});
 it("propagates terminal store failure",async()=>{const x=setup();x.recordTerminal.mockRejectedValue(new Error("terminal store down"));await expect(x.api.build(request)).rejects.toThrow("terminal store down");});
 it("preserves both errors",async()=>{const x=setup();x.engine.build.mockRejectedValue(new Error("host lost"));x.recordTerminal.mockRejectedValue(new Error("store down"));await expect(x.api.build(request)).rejects.toBeInstanceOf(AggregateError);});
 it("rejects pre-aborted request without claiming",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.api.build({...request,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.claimOperation).not.toHaveBeenCalled();});
 it("records uncertainty if aborted after durable claim",async()=>{const x=setup(),controller=new AbortController();x.claimOperation.mockImplementation(async()=>{controller.abort();return {accepted:true,fence:"fence-1"};});await expect(x.api.build({...request,signal:controller.signal})).rejects.toThrow("cancelled");expect(x.recordTerminal).toHaveBeenCalledWith(expect.objectContaining({status:"uncertain"}));expect(x.engine.build).not.toHaveBeenCalled();});
});
