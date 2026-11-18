import {describe,it,expect} from "vitest";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {createReviewTrustBoundary} from "../../next-engines/orchestration/review-trust-boundary.js";
const req=(id="phase35")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
describe("Hyper phase 35 — hostile inputs and interrupted persistence",()=>{
 it("rejects hostile getters without invoking them or writing",async()=>{
  const input=req();let accessed=0,saves=0;
  Object.defineProperty(input.payload,"trap",{enumerable:true,get(){accessed++;throw Error("GETTER_EXECUTED");}});
  await expect(createReviewControlPlane().run(input,{save:async()=>{saves++;},load:async()=>null}))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(accessed).toBe(0);expect(saves).toBe(0);
 });
 it("rejects prototype pollution, cycles and unsupported types",()=>{
  const boundary=createReviewTrustBoundary();
  const polluted=req();polluted.payload.inputs.truth=JSON.parse('{"constructor":{"prototype":{"polluted":true}}}');
  expect(()=>boundary.isolate(polluted)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
  const cyclic=req();cyclic.payload.cyclic=cyclic;
  expect(()=>boundary.isolate(cyclic)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
  const unsupported=req();unsupported.payload.fn=()=>true;
  expect(()=>boundary.isolate(unsupported)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("does not release capacity while a timed-out write is still pending",async()=>{
  const gate=deferred();let saves=0;
  const store={save:async()=>{saves++;await gate.promise;return {saved:true,requestId:"phase35",executionAuthorized:false};},load:async()=>null};
  const plane=createReviewControlPlane({timeoutMs:15,maxInFlight:1,failureThreshold:1});
  const first=plane.run(req(),store);
  await tick();
  expect(plane.snapshot().health.inFlight).toBe(1);
  await expect(first).rejects.toMatchObject({code:"REQUEST_TIMEOUT"});
  expect(plane.snapshot().health.inFlight).toBe(1);
  await expect(plane.run(req("second"),store)).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
  expect(saves).toBe(1);
  expect(plane.snapshot().circuit.state).toBe("closed");
  gate.reject(Error("SIMULATED_WRITE_INTERRUPTION"));
  await tick();await tick();
  expect(plane.snapshot().health.inFlight).toBe(0);
 });
 it("cancellation does not release capacity before persistence settles",async()=>{
  const gate=deferred();const controller=new AbortController();
  const store={save:()=>gate.promise,load:async()=>null};
  const plane=createReviewControlPlane({timeoutMs:1000,maxInFlight:1,failureThreshold:1});
  const first=plane.run(req(),store,{signal:controller.signal});
  await tick();controller.abort();
  await expect(first).rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  expect(plane.snapshot().health.inFlight).toBe(1);
  await expect(plane.run(req("second"),store)).rejects.toMatchObject({code:"CAPACITY_EXCEEDED"});
  gate.reject(Error("SIMULATED_WRITE_INTERRUPTION"));
  await tick();await tick();
  expect(plane.snapshot().health.inFlight).toBe(0);
 });
 it("refuses forged execution fields in untrusted input without authorizing anything",async()=>{
  const input=req();input.payload.inputs.execution={sandboxVerified:true,approvalVerified:true,
   policyVerified:true,recoveryVerified:true,idempotencyVerified:true};
  const boundary=createReviewTrustBoundary();
  const response=boundary.coordinate(input);
  expect(response.result).toMatchObject({authorizedForExecution:false,sideEffects:false});
  expect(response.result.stages[0].result).toMatchObject({verifiedByTrustedRuntime:false,sideEffects:false});
 });
});
