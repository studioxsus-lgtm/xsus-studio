import {describe,it,expect,vi} from "vitest";
import {createConcurrencyLimiter} from "../../src/xsus-app-build-engine/reliability/concurrency-limiter.js";
import {createOperationMetrics} from "../../src/xsus-app-build-engine/reliability/operation-metrics.js";
describe("XSUS performance and reliability phase 19",()=>{
  it("validates concurrency configuration",()=>expect(()=>createConcurrencyLimiter({maxConcurrent:0})).toThrow("concurrency"));
  it("executes tasks and releases slots",async()=>{const limiter=createConcurrencyLimiter({maxConcurrent:1});expect(await limiter.run(async()=>42)).toBe(42);expect(limiter.snapshot().active).toBe(0);});
  it("limits concurrent execution",async()=>{let release;const limiter=createConcurrencyLimiter({maxConcurrent:1});const first=limiter.run(()=>new Promise(resolve=>{release=resolve;}));await Promise.resolve();const second=limiter.run(async()=>2);expect(limiter.snapshot().queued).toBe(1);release(1);expect(await first).toBe(1);expect(await second).toBe(2);});
  it("rejects a saturated queue",async()=>{const limiter=createConcurrencyLimiter({maxConcurrent:1,maxQueued:0});let release;const first=limiter.run(()=>new Promise(resolve=>{release=resolve;}));await Promise.resolve();await expect(limiter.run(async()=>2)).rejects.toThrow("capacity");release(1);await first;});
  it("rejects pre-cancelled work",async()=>{const limiter=createConcurrencyLimiter();await expect(limiter.run(async()=>1,{signal:{aborted:true}})).rejects.toThrow("cancelled");});
  it("records successful operation duration",async()=>{let now=0;const metrics=createOperationMetrics({clock:()=>now});await metrics.measure("build",async()=>{now=12;return 1;});expect(metrics.summary("build")).toMatchObject({count:1,successes:1,averageMs:12,p95Ms:12});});
  it("records failed operations without leaking error text",async()=>{const metrics=createOperationMetrics();await expect(metrics.measure("build",async()=>{throw new Error("secret");})).rejects.toThrow("secret");expect(metrics.summary("build")).toMatchObject({count:1,failures:1});});
  it("retains only bounded metric samples",async()=>{const metrics=createOperationMetrics({maxSamples:1});await metrics.measure("a",async()=>1);await metrics.measure("b",async()=>2);expect(metrics.summary().count).toBe(1);expect(metrics.summary("a").count).toBe(0);});
});
