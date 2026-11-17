import {describe,it,expect} from "vitest";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
const req=id=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper six engines phase 23 — review-only control plane",()=>{
 it("combines admission, circuit state and passive health snapshots",async()=>{
  const plane=createReviewControlPlane({maxInFlight:1,failureThreshold:2});
  const gate=deferred();
  const pending=plane.run(req("one"),{save:async()=>{await gate.promise;throw Error("IO_FAIL");},load:async()=>null});
  const busy=plane.snapshot();
  expect(busy.health).toMatchObject({status:"saturated",inFlight:1});
  expect(busy.circuit).toMatchObject({state:"closed",accepted:1});
  expect(busy).toMatchObject({executionAuthorized:false,sideEffects:false});
  expect(Object.isFrozen(busy)).toBe(true);
  gate.resolve();
  await expect(pending).rejects.toThrow("IO_FAIL");
  expect(plane.snapshot().health.inFlight).toBe(0);
 });
 it("opens circuit after repeated failures and blocks additional writes",async()=>{
  const plane=createReviewControlPlane({failureThreshold:2});
  let writes=0;
  const store={save:async()=>{writes++;throw Error("IO_FAIL");},load:async()=>null};
  await expect(plane.run(req("first"),store)).rejects.toThrow("IO_FAIL");
  await expect(plane.run(req("second"),store)).rejects.toThrow("IO_FAIL");
  expect(plane.snapshot().circuit.state).toBe("open");
  await expect(plane.run(req("third"),store)).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
  expect(writes).toBe(2);
 });
 it("allows a single recovery probe after cooldown",async()=>{
  let now=0;
  const plane=createReviewControlPlane({failureThreshold:1,cooldownMs:10,clock:()=>now});
  await expect(plane.run(req("fail"),{save:async()=>{throw Error("IO_FAIL");},load:async()=>null})).rejects.toThrow();
  now=10;
  const gate=deferred();
  const pending=plane.run(req("probe"),{save:async()=>{await gate.promise;throw Error("PROBE_FAIL");},load:async()=>null});
  await expect(plane.run(req("parallel"),{})).rejects.toMatchObject({code:"CIRCUIT_OPEN"});
  gate.resolve();
  await expect(pending).rejects.toThrow("PROBE_FAIL");
  expect(plane.snapshot().circuit).toMatchObject({state:"open",openedAt:10,probeInFlight:false});
 });
 it("reports cancelled admission without writing or authorizing execution",async()=>{
  const plane=createReviewControlPlane({failureThreshold:3});
  const controller=new AbortController();controller.abort();
  let writes=0;
  await expect(plane.run(req("cancel"),{save:async()=>{writes++;}}, {signal:controller.signal}))
    .rejects.toMatchObject({code:"REQUEST_CANCELLED"});
  expect(writes).toBe(0);
  expect(plane.snapshot()).toMatchObject({health:{cancelled:1,inFlight:0},executionAuthorized:false});
 });
 it("rejects invalid configuration without creating a runnable plane",()=>{
  expect(()=>createReviewControlPlane({maxInFlight:0})).toThrow();
  expect(()=>createReviewControlPlane({timeoutMs:0})).toThrow();
  expect(()=>createReviewControlPlane({failureThreshold:0})).toThrow();
 });
});
