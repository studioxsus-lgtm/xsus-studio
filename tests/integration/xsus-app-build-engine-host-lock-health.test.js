import {describe,it,expect,vi} from "vitest";
import {createHostLockHealthGuard} from "../../src/xsus-app-build-engine/sandbox/host-lock-health-guard.js";
const executionId="execution-0001";
function setup({healthy=true,closeFails=false}={}){
 let lost,health=healthy;
 const monitor={verify:vi.fn(async()=>health),close:vi.fn(async()=>{if(closeFails)throw new Error("close failed");})};
 const withExclusiveExecutionLock=vi.fn(async(_id,fn)=>fn());
 const createMonitor=vi.fn(async({onLost})=>{lost=()=>{health=false;onLost();};return monitor;});
 return {guard:createHostLockHealthGuard({withExclusiveExecutionLock,createMonitor}),monitor,createMonitor,withExclusiveExecutionLock,lose:()=>lost()};
}
describe("XSUS phase 54 host lock health guard",()=>{
 it("requires dependencies",()=>expect(()=>createHostLockHealthGuard()).toThrow("dependencies"));
 it("checks health before and after callback",async()=>{const x=setup();expect(await x.guard.withGuardedLock(executionId,async()=>42)).toBe(42);expect(x.monitor.verify).toHaveBeenCalledTimes(2);});
 it("runs under outer lock",async()=>{const x=setup();await x.guard.withGuardedLock(executionId,async()=>{});expect(x.withExclusiveExecutionLock).toHaveBeenCalledOnce();});
 it("refuses unhealthy lock before callback",async()=>{const x=setup({healthy:false}),action=vi.fn();await expect(x.guard.withGuardedLock(executionId,action)).rejects.toThrow("unverified");expect(action).not.toHaveBeenCalled();});
 it("signals lock loss during action",async()=>{const x=setup();await expect(x.guard.withGuardedLock(executionId,async({signal})=>{x.lose();expect(signal.aborted).toBe(true);})).rejects.toThrow("uncertain");});
 it("closes monitor on callback failure",async()=>{const x=setup();await expect(x.guard.withGuardedLock(executionId,async()=>{throw new Error("action failed");})).rejects.toThrow("action failed");expect(x.monitor.close).toHaveBeenCalledOnce();});
 it("closes monitor on lock loss",async()=>{const x=setup();await expect(x.guard.withGuardedLock(executionId,async()=>x.lose())).rejects.toThrow("uncertain");expect(x.monitor.close).toHaveBeenCalledOnce();});
 it("rejects cleanup failure",async()=>await expect(setup({closeFails:true}).guard.withGuardedLock(executionId,async()=>{})).rejects.toThrow("close failed"));
 it("rejects invalid execution ID",async()=>await expect(setup().guard.withGuardedLock("../bad",async()=>{})).rejects.toThrow("Invalid"));
 it("rejects invalid callback",async()=>await expect(setup().guard.withGuardedLock(executionId,null)).rejects.toThrow("Invalid"));
 it("rejects invalid monitor",async()=>{const x=setup();x.createMonitor.mockResolvedValue({});await expect(x.guard.withGuardedLock(executionId,async()=>{})).rejects.toThrow("monitor");});
 it("does not claim success after lost lock",async()=>{const x=setup();await expect(x.guard.withGuardedLock(executionId,async()=>{x.lose();return "success";})).rejects.toThrow("uncertain");});
});
