import {describe,it,expect} from "vitest";
import {createReviewCircuitBreaker} from "../../next-engines/orchestration/review-circuit-breaker.js";
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper six engines phase 22 — local review circuit breaker",()=>{
 it("opens after consecutive failures and blocks execution",async()=>{
  let calls=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:3,clock:()=>100});
  for(let i=0;i<3;i++)await expect(breaker.run(async()=>{calls++;throw Error("FAIL");})).rejects.toThrow("FAIL");
  await expect(breaker.run(async()=>{calls++;})).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
  expect(calls).toBe(3);
  expect(breaker.metrics()).toMatchObject({state:"open",failures:3,rejected:1,executionAuthorized:false});
 });
 it("resets consecutive failures after a successful operation",async()=>{
  const breaker=createReviewCircuitBreaker({failureThreshold:2});
  await expect(breaker.run(async()=>{throw Error("FAIL");})).rejects.toThrow();
  await breaker.run(async()=>({recorded:true}));
  await expect(breaker.run(async()=>{throw Error("FAIL");})).rejects.toThrow();
  expect(breaker.metrics()).toMatchObject({state:"closed",failures:1});
 });
 it("allows exactly one half-open probe and closes after success",async()=>{
  let time=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:1,cooldownMs:10,clock:()=>time});
  await expect(breaker.run(async()=>{throw Error("FAIL");})).rejects.toThrow();
  time=10;
  const gate=deferred();
  const pending=breaker.run(async()=>{await gate.promise;return "RECOVERED";});
  expect(breaker.metrics()).toMatchObject({state:"half_open",probeInFlight:true});
  await expect(breaker.run(async()=>{})).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
  gate.resolve();
  await expect(pending).resolves.toBe("RECOVERED");
  expect(breaker.metrics()).toMatchObject({state:"closed",failures:0,probeInFlight:false});
 });
 it("reopens after a failed half-open probe",async()=>{
  let time=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:1,cooldownMs:10,clock:()=>time});
  await expect(breaker.run(async()=>{throw Error("FIRST");})).rejects.toThrow();
  time=10;
  await expect(breaker.run(async()=>{throw Error("PROBE");})).rejects.toThrow("PROBE");
  expect(breaker.metrics()).toMatchObject({state:"open",openedAt:10,probeInFlight:false});
  await expect(breaker.run(async()=>{})).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
 });
 it("does not allow retries before cooldown",async()=>{
  let time=0,calls=0;
  const breaker=createReviewCircuitBreaker({failureThreshold:1,cooldownMs:100,clock:()=>time});
  await expect(breaker.run(async()=>{calls++;throw Error("FAIL");})).rejects.toThrow();
  time=99;
  await expect(breaker.run(async()=>{calls++;})).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
  expect(calls).toBe(1);
 });
 it("validates configuration and exposes immutable counters",()=>{
  expect(()=>createReviewCircuitBreaker({failureThreshold:0})).toThrow();
  expect(()=>createReviewCircuitBreaker({cooldownMs:-1})).toThrow();
  expect(()=>createReviewCircuitBreaker({clock:()=>NaN}).run(()=>{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  const metrics=createReviewCircuitBreaker().metrics();
  expect(Object.isFrozen(metrics)).toBe(true);
  expect(metrics).toMatchObject({state:"closed",accepted:0,rejected:0});
 });
});
