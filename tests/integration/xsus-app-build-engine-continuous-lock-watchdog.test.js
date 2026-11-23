import {describe,it,expect,vi} from "vitest";
import {createContinuousLockWatchdog} from "../../src/xsus-app-build-engine/sandbox/continuous-lock-watchdog.js";
function setup({healthy=true}={}){
 let callback;let ok=healthy;
 const monitor={verify:vi.fn(async()=>ok)};
 const schedule=vi.fn(fn=>{callback=fn;return 1;});
 const cancel=vi.fn();
 return {watchdog:createContinuousLockWatchdog({monitor,schedule,cancel,intervalMs:100}),monitor,schedule,cancel,tick:async()=>callback(),fail:()=>{ok=false;}};
}
describe("XSUS phase 57 continuous lock watchdog",()=>{
 it("requires dependencies",()=>expect(()=>createContinuousLockWatchdog()).toThrow("dependencies"));
 it("returns callback result",async()=>expect(await setup().watchdog.run(async()=>42)).toBe(42));
 it("checks before and after action",async()=>{const x=setup();await x.watchdog.run(async()=>{});expect(x.monitor.verify).toHaveBeenCalledTimes(2);});
 it("schedules and cancels checks",async()=>{const x=setup();await x.watchdog.run(async()=>{});expect(x.schedule).toHaveBeenCalledOnce();expect(x.cancel).toHaveBeenCalledOnce();});
 it("refuses unhealthy initial lock",async()=>{const x=setup({healthy:false}),fn=vi.fn();await expect(x.watchdog.run(fn)).rejects.toThrow("initial");expect(fn).not.toHaveBeenCalled();});
 it("detects lock loss during callback",async()=>{const x=setup();await expect(x.watchdog.run(async({signal})=>{x.fail();await x.tick();expect(signal.aborted).toBe(true);})).rejects.toThrow("uncertain");});
 it("rejects failed final check",async()=>{const x=setup();await expect(x.watchdog.run(async()=>{x.fail();})).rejects.toThrow("final");});
 it("propagates callback error",async()=>await expect(setup().watchdog.run(async()=>{throw new Error("failed");})).rejects.toThrow("failed"));
 it("rejects missing callback",async()=>await expect(setup().watchdog.run(null)).rejects.toThrow("Callback"));
 it("rejects too frequent polling",()=>expect(()=>createContinuousLockWatchdog({monitor:{verify:async()=>true},schedule:()=>1,cancel:()=>{},intervalMs:1})).toThrow("dependencies"));
 it("does not reschedule after lock loss",async()=>{const x=setup();await expect(x.watchdog.run(async()=>{x.fail();await x.tick();})).rejects.toThrow("uncertain");expect(x.schedule).toHaveBeenCalledOnce();});
 it("accepts cooperative signal",async()=>{const x=setup();await x.watchdog.run(async({signal})=>expect(signal.aborted).toBe(false));});
});
