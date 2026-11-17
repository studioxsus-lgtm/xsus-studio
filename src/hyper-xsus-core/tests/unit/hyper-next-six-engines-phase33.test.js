import {describe,it,expect} from "vitest";
import {coordinateAndRecord} from "../../next-engines/orchestration/review-pipeline.js";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {createReviewTrustBoundary} from "../../next-engines/orchestration/review-trust-boundary.js";
const req=()=>({contractVersion:"1.0.0",requestId:"phase33",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace33",authorizationRef:"policy:test"}});
const spyStore=()=>{let calls=0;return {get calls(){return calls;},save:async()=>{calls++;return {};},load:async()=>null};};
describe("Hyper phase 33 — trust boundary on all review pipeline entry points",()=>{
 it("rejects pollution through direct pipeline before any save",async()=>{
  const input=req();input.payload.inputs.truth=JSON.parse('{"__proto__":{"admin":true}}');
  const store=spyStore();
  await expect(coordinateAndRecord(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(store.calls).toBe(0);
 });
 it("rejects getters through direct pipeline without invoking them",async()=>{
  const input=req();let invoked=0;
  Object.defineProperty(input.context,"token",{enumerable:true,get(){invoked++;return "secret";}});
  const store=spyStore();
  await expect(coordinateAndRecord(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(invoked).toBe(0);expect(store.calls).toBe(0);
 });
 it("rejects unknown stages through direct pipeline",async()=>{
  const input=req();input.payload.inputs.untrusted={};
  const store=spyStore();
  await expect(coordinateAndRecord(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(store.calls).toBe(0);
 });
 it("rejects cyclic data through direct pipeline",async()=>{
  const input=req();input.payload.self=input;
  const store=spyStore();
  await expect(coordinateAndRecord(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(store.calls).toBe(0);
 });
 it("rejects unsafe direct input consistently with control plane",async()=>{
  const input=req();input.payload.inputs.unknown={};
  const store=spyStore();
  await expect(createReviewControlPlane().run(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  await expect(coordinateAndRecord(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(store.calls).toBe(0);
 });
 it("isolates mutable inputs before orchestration",()=>{
  const input=req();input.payload.inputs.learning={content:"hello",sourceRef:"source"};
  const isolated=createReviewTrustBoundary().isolate(input);
  input.payload.inputs.learning.content="modified";
  expect(isolated.payload.inputs.learning.content).toBe("hello");
  expect(isolated.payload.inputs.learning).not.toBe(input.payload.inputs.learning);
 });
});
