import {describe,it,expect} from "vitest";
import {createReviewDeadline} from "../../next-engines/orchestration/review-deadline.js";
const req=id=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{}},context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper six engines phase 18 — safe review deadlines",()=>{
 it("rejects a pre-aborted request without touching the store",async()=>{
  const deadline=createReviewDeadline();
  const controller=new AbortController();controller.abort();
  let writes=0;
  await expect(deadline.run(req("abort"),{save:()=>{writes++;}},{signal:controller.signal})).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  expect(writes).toBe(0);
  expect(deadline.metrics()).toMatchObject({inFlight:0,cancelled:1});
 });
 it("does not release a capacity slot when the caller times out",async()=>{
  const gate=deferred();
  const deadline=createReviewDeadline({timeoutMs:15,maxInFlight:1});
  const first=deadline.run(req("first"),{save:async()=>{await gate.promise;throw new Error("INJECTED");},load:async()=>null});
  await expect(first).rejects.toMatchObject({code:"REQUEST_TIMEOUT"});
  expect(deadline.metrics()).toMatchObject({inFlight:1,timedOut:1});
  await expect(deadline.run(req("second"),{})).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
  gate.resolve();
  // Let the guarded persistence operation finish before checking capacity.
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(deadline.metrics().inFlight).toBe(0);
 });
 it("does not abort in-flight persistence after cancellation",async()=>{
  const gate=deferred();
  const controller=new AbortController();
  let completed=false;
  const deadline=createReviewDeadline({timeoutMs:500,maxInFlight:1});
  const first=deadline.run(req("cancel"),{save:async()=>{await gate.promise;completed=true;throw new Error("INJECTED");},load:async()=>null},{signal:controller.signal});
  controller.abort();
  await expect(first).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  expect(deadline.metrics().inFlight).toBe(1);
  gate.resolve();
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(completed).toBe(true);
  expect(deadline.metrics().inFlight).toBe(0);
 });
 it("reports validation errors for invalid deadlines and signals",async()=>{
  expect(()=>createReviewDeadline({timeoutMs:0})).toThrow();
  const deadline=createReviewDeadline();
  expect(()=>deadline.run(req("bad"),{}, {signal:{aborted:false}})).toThrow();
 });
 it("exposes frozen metrics",()=>{
  const metrics=createReviewDeadline({timeoutMs:25}).metrics();
  expect(Object.isFrozen(metrics)).toBe(true);
  expect(metrics).toMatchObject({timedOut:0,cancelled:0,timeoutMs:25});
 });
});
