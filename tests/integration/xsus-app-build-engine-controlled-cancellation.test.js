import {describe,it,expect,vi} from "vitest";
import {createControlledExecutionCancellation} from "../../src/xsus-app-build-engine/sandbox/controlled-execution-cancellation.js";
const executionId="execution-0001",operationId="operation-0001";
function setup(){let timeout;const requestStop=vi.fn(async()=>{}),recordUncertain=vi.fn(async()=>{}),schedule=vi.fn(fn=>{timeout=fn;return 1;}),cancel=vi.fn();return {coordinator:createControlledExecutionCancellation({requestStop,recordUncertain,schedule,cancel}),requestStop,recordUncertain,schedule,cancel,timeout:()=>timeout()};}
const args={executionId,operationId,timeoutMs:100};
describe("XSUS phase 58 controlled cancellation",()=>{
 it("requires trusted dependencies",()=>expect(()=>createControlledExecutionCancellation()).toThrow("dependencies"));
 it("returns successful result",async()=>expect(await setup().coordinator.execute({...args,run:async()=>42})).toBe(42));
 it("clears timer after completion",async()=>{const x=setup();await x.coordinator.execute({...args,run:async()=>{}});expect(x.cancel).toHaveBeenCalledOnce();});
 it("does not request stop on success",async()=>{const x=setup();await x.coordinator.execute({...args,run:async()=>{}});expect(x.requestStop).not.toHaveBeenCalled();});
 it("marks timed out execution uncertain",async()=>{const x=setup();await expect(x.coordinator.execute({...args,run:async()=>{x.timeout();}})).rejects.toThrow("requires reconciliation");expect(x.recordUncertain).toHaveBeenCalledOnce();});
 it("requests stop on timeout",async()=>{const x=setup();await expect(x.coordinator.execute({...args,run:async()=>x.timeout()})).rejects.toThrow("uncertain");expect(x.requestStop).toHaveBeenCalledWith({executionId,operationId,reason:"timeout"});});
 it("signals cooperative cancellation",async()=>{const x=setup();await expect(x.coordinator.execute({...args,run:async({signal})=>{x.timeout();expect(signal.aborted).toBe(true);}})).rejects.toThrow("uncertain");});
 it("rejects already cancelled signal",async()=>{const x=setup(),controller=new AbortController();controller.abort();await expect(x.coordinator.execute({...args,signal:controller.signal,run:async()=>{}})).rejects.toThrow("before start");});
 it("preserves original run failure",async()=>await expect(setup().coordinator.execute({...args,run:async()=>{throw new Error("run failed");}})).rejects.toThrow("run failed"));
 it("rejects invalid timeout",async()=>await expect(setup().coordinator.execute({...args,timeoutMs:0,run:async()=>{}})).rejects.toThrow("Invalid"));
 it("records failed stop attempt as uncertain",async()=>{const x=setup();x.requestStop.mockRejectedValue(new Error("stop failed"));await expect(x.coordinator.execute({...args,run:async()=>x.timeout()})).rejects.toThrow("reconciliation");expect(x.recordUncertain).toHaveBeenCalledWith(expect.objectContaining({stopRequested:false}));});
 it("does not hide receipt failure",async()=>{const x=setup();x.recordUncertain.mockRejectedValue(new Error("audit failed"));try{await x.coordinator.execute({...args,run:async()=>x.timeout()});throw new Error("unexpected");}catch(error){expect(error.errors.some(e=>e.message==="audit failed")).toBe(true);}});
});
