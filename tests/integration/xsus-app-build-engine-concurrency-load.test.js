import {describe,it,expect,vi} from "vitest";
import {createBuildConcurrencyLimiter} from "../../src/xsus-app-build-engine/integration/build-concurrency-limiter.js";
import {createLoadControlledProjectBuild} from "../../src/xsus-app-build-engine/integration/load-controlled-project-build.js";
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};}
describe("XSUS phase 67 concurrency and load admission",()=>{
 it("rejects zero active slots",()=>expect(()=>createBuildConcurrencyLimiter({maxActive:0})).toThrow());
 it("rejects negative queue",()=>expect(()=>createBuildConcurrencyLimiter({maxQueued:-1})).toThrow());
 it("rejects excessive active slots",()=>expect(()=>createBuildConcurrencyLimiter({maxActive:65})).toThrow());
 it("rejects non-function task",async()=>await expect(createBuildConcurrencyLimiter().run(null)).rejects.toThrow("function"));
 it("returns task result",async()=>expect(await createBuildConcurrencyLimiter().run(async()=>42)).toBe(42));
 it("releases slot after rejection",async()=>{const x=createBuildConcurrencyLimiter({maxActive:1});await expect(x.run(async()=>{throw new Error("failure")})).rejects.toThrow("failure");expect(x.snapshot().active).toBe(0);});
 it("bounds queue and rejects overflow",async()=>{const x=createBuildConcurrencyLimiter({maxActive:1,maxQueued:1});const gate=deferred();const first=x.run(()=>gate.promise);const second=x.run(async()=>2);await expect(x.run(async()=>3)).rejects.toThrow("queue full");gate.resolve(1);expect(await first).toBe(1);expect(await second).toBe(2);});
 it("does not exceed active capacity under burst",async()=>{const x=createBuildConcurrencyLimiter({maxActive:3,maxQueued:40});let peak=0,active=0;await Promise.all(Array.from({length:35},()=>x.run(async()=>{active++;peak=Math.max(peak,active);await tick();active--;return true;})));expect(peak).toBeLessThanOrEqual(3);expect(x.snapshot()).toMatchObject({active:0,queued:0});});
 it("preserves FIFO admission",async()=>{const x=createBuildConcurrencyLimiter({maxActive:1});const order=[];const gate=deferred();const first=x.run(()=>gate.promise);const a=x.run(async()=>{order.push("a")});const b=x.run(async()=>{order.push("b")});gate.resolve();await Promise.all([first,a,b]);expect(order).toEqual(["a","b"]);});
 it("cancels queued task without running it",async()=>{const x=createBuildConcurrencyLimiter({maxActive:1});const gate=deferred();const first=x.run(()=>gate.promise);const controller=new AbortController(),task=vi.fn();const second=x.run(task,{signal:controller.signal});controller.abort();await expect(second).rejects.toThrow("cancelled");gate.resolve();await first;expect(task).not.toHaveBeenCalled();});
 it("rejects pre-aborted task",async()=>{const controller=new AbortController();controller.abort();await expect(createBuildConcurrencyLimiter().run(async()=>1,{signal:controller.signal})).rejects.toThrow("cancelled");});
 it("supports zero queue",async()=>{const x=createBuildConcurrencyLimiter({maxActive:1,maxQueued:0});const gate=deferred();const first=x.run(()=>gate.promise);await expect(x.run(async()=>2)).rejects.toThrow("queue full");gate.resolve();await first;});
 it("returns immutable metrics",()=>{const metrics=createBuildConcurrencyLimiter().snapshot();expect(Object.isFrozen(metrics)).toBe(true);});
 it("rejects missing backend dependencies",()=>expect(()=>createLoadControlledProjectBuild()).toThrow());
});
