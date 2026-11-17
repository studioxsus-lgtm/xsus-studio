import {describe,it,expect} from "vitest";
import {createReviewResourceGuard} from "../../next-engines/orchestration/resource-guard.js";
import {createReviewDeadline} from "../../next-engines/orchestration/review-deadline.js";
import {createReviewHealthMonitor} from "../../next-engines/orchestration/review-health.js";
const req=id=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper six engines phase 21 — passive health monitoring",()=>{
 it("reports an immutable idle snapshot with no authorization",()=>{
  const monitor=createReviewHealthMonitor({source:createReviewResourceGuard(),clock:()=>123});
  const report=monitor.snapshot();
  expect(report).toMatchObject({timestamp:123,status:"idle",inFlight:0,atCapacity:false,executionAuthorized:false,sideEffects:false});
  expect(Object.isFrozen(report)).toBe(true);
 });
 it("reports saturation while work is pending, then idle after failure",async()=>{
  const guard=createReviewResourceGuard({maxInFlight:1});
  const monitor=createReviewHealthMonitor({source:guard,clock:()=>456});
  const gate=deferred();
  const pending=guard.run(req("pending"),{save:async()=>{await gate.promise;throw Error("INJECTED");},load:async()=>null});
  expect(monitor.snapshot()).toMatchObject({status:"saturated",inFlight:1,atCapacity:true});
  gate.resolve();
  await expect(pending).rejects.toThrow("INJECTED");
  expect(monitor.snapshot()).toMatchObject({status:"idle",inFlight:0,accepted:1});
 });
 it("reports busy when work remains below capacity",async()=>{
  const guard=createReviewResourceGuard({maxInFlight:3});
  const monitor=createReviewHealthMonitor({source:guard});
  const gate=deferred();
  const pending=guard.run(req("busy"),{save:async()=>{await gate.promise;throw Error("INJECTED");},load:async()=>null});
  expect(monitor.snapshot()).toMatchObject({status:"busy",inFlight:1,atCapacity:false});
  gate.resolve();
  await expect(pending).rejects.toThrow("INJECTED");
 });
 it("exposes cancellation counters without exposing request contents",async()=>{
  const deadline=createReviewDeadline();
  const monitor=createReviewHealthMonitor({source:deadline});
  const controller=new AbortController();controller.abort();
  await expect(deadline.run(req("secret"),{}, {signal:controller.signal})).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  const report=monitor.snapshot();
  expect(report).toMatchObject({cancelled:1,timedOut:0,executionAuthorized:false});
  expect(JSON.stringify(report)).not.toContain("secret");
 });
 it("rejects malformed and regressing metrics",()=>{
  const source={metrics:()=>({inFlight:2,maxInFlight:1,accepted:0,rejected:0})};
  expect(()=>createReviewHealthMonitor({source}).snapshot()).toThrow();
  let accepted=2;
  const monitor=createReviewHealthMonitor({source:{metrics:()=>({inFlight:0,maxInFlight:2,accepted,rejected:0})}});
  monitor.snapshot();accepted=1;
  expect(()=>monitor.snapshot()).toThrowError(expect.objectContaining({code:"METRICS_REGRESSION"}));
 });
 it("rejects invalid clock readings and missing metrics",()=>{
  expect(()=>createReviewHealthMonitor({source:{}})).toThrow();
  expect(()=>createReviewHealthMonitor({source:createReviewResourceGuard(),clock:()=>NaN}).snapshot()).toThrow();
 });
});
