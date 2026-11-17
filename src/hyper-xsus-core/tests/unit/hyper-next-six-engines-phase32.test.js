import {describe,it,expect} from "vitest";
import {createReviewCircuitBreaker} from "../../next-engines/orchestration/review-circuit-breaker.js";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const failure=code=>Object.assign(Error(code),{code});
describe("Hyper phase 32 — classified failures and concurrent circuit fencing",()=>{
 it("does not open on expected validation and capacity failures",async()=>{
  const breaker=createReviewCircuitBreaker({failureThreshold:1});
  for(const code of ["INVALID_INPUT","REQUEST_TIMEOUT","REQUEST_CANCELLED","CAPACITY_EXCEEDED","JOURNAL_CONFLICT"])
   await expect(breaker.run(()=>Promise.reject(failure(code)))).rejects.toMatchObject({code});
  expect(breaker.metrics()).toMatchObject({state:"closed",failures:0,ignoredFailures:5});
 });
 it("opens on an unexpected persistence failure",async()=>{
  const breaker=createReviewCircuitBreaker({failureThreshold:1,clock:()=>0});
  await expect(breaker.run(()=>Promise.reject(failure("CORRUPT_JOURNAL")))).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
  expect(breaker.metrics()).toMatchObject({state:"open",failures:1});
 });
 it("stale success cannot close an opened circuit",async()=>{
  const breaker=createReviewCircuitBreaker({failureThreshold:1,clock:()=>0});
  const gate=deferred();
  const stale=breaker.run(()=>gate.promise);
  await expect(breaker.run(()=>Promise.reject(Error("IO_DOWN")))).rejects.toThrow("IO_DOWN");
  gate.resolve("late-success");
  await expect(stale).resolves.toBe("late-success");
  expect(breaker.metrics().state).toBe("open");
 });
 it("stale failure cannot reopen a circuit recovered by a probe",async()=>{
  let time=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:1,cooldownMs:10,clock:()=>time});
  const gate=deferred();
  const stale=breaker.run(()=>gate.promise);
  await expect(breaker.run(()=>Promise.reject(Error("IO_DOWN")))).rejects.toThrow();
  time=10;
  await expect(breaker.run(()=>Promise.resolve("healthy"))).resolves.toBe("healthy");
  gate.resolve();
  await expect(stale).resolves.toBeUndefined();
  expect(breaker.metrics()).toMatchObject({state:"closed",failures:0});
 });
 it("a stale failure cannot alter an open circuit's cooldown start",async()=>{
  let time=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:1,cooldownMs:100,clock:()=>time});
  const gate=deferred();
  const stale=breaker.run(()=>gate.promise.then(()=>{throw Error("LATE");}));
  await expect(breaker.run(()=>Promise.reject(Error("IO_DOWN")))).rejects.toThrow();
  time=20;gate.resolve();
  await expect(stale).rejects.toThrow("LATE");
  expect(breaker.metrics()).toMatchObject({state:"open",openedAt:0});
 });
 it("control plane does not open on caller validation errors",async()=>{
  const plane=createReviewControlPlane({failureThreshold:1});
  await expect(plane.run({invalid:true},{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(plane.snapshot().circuit).toMatchObject({state:"closed",failures:0,ignoredFailures:1});
 });
});
