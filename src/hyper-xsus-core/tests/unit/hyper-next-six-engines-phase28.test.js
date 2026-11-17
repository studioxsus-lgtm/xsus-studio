import {describe,it,expect} from "vitest";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";

const req=(id="phase28")=>({
 contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}
});
describe("Hyper six engines phase 28 — trust boundary integrated with control plane",()=>{
 it("rejects prototype pollution before persistence",async()=>{
  const plane=createReviewControlPlane();
  const input=req();input.payload.inputs.truth=JSON.parse('{"__proto__":{"admin":true}}');
  let saves=0;
  await expect(plane.run(input,{save:async()=>{saves++;},load:async()=>null}))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(saves).toBe(0);
  expect(plane.snapshot().health.inFlight).toBe(0);
 });
 it("rejects accessors without invoking them",async()=>{
  const plane=createReviewControlPlane();
  const input=req();let invoked=0;
  Object.defineProperty(input.context,"hidden",{enumerable:true,get(){invoked++;return "unsafe";}});
  await expect(plane.run(input,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(invoked).toBe(0);
 });
 it("rejects unknown stage names before storage",async()=>{
  const plane=createReviewControlPlane();
  const input=req();input.payload.inputs.unknown={};
  await expect(plane.run(input,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
 });
 it("rejects oversized requests before resource admission",async()=>{
  const plane=createReviewControlPlane({maxRequestBytes:256});
  const input=req();input.payload.extra="x".repeat(1000);
  await expect(plane.run(input,{})).rejects.toMatchObject({code:"REQUEST_TOO_LARGE"});
  expect(plane.snapshot().health).toMatchObject({inFlight:0,accepted:0});
 });
 it("rejects cyclic inputs and enforces depth and node limits",async()=>{
  const cyclic=req();cyclic.payload.cycle=cyclic;
  await expect(createReviewControlPlane().run(cyclic,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  const nested=req();nested.payload.inputs.truth={claim:"nested"};
  await expect(createReviewControlPlane({maxDepth:2}).run(nested,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  await expect(createReviewControlPlane({maxNodes:3}).run(req(),{})).rejects.toMatchObject({code:"INVALID_INPUT"});
 });
 it("keeps review-only outcomes and never authorizes execution",async()=>{
  const plane=createReviewControlPlane();
  let saved;
  const store={
   save:async response=>{saved=response;return {saved:true,requestId:response.requestId,executionAuthorized:false};},
   load:async()=>{
    const {createDecisionJournal}=await import("../../next-engines/orchestration/decision-journal.js");
    const {createRecoveryCheckpoint}=await import("../../next-engines/orchestration/recovery-checkpoint.js");
    const journal=createDecisionJournal(saved);
    return {recovered:true,executionAuthorized:false,journal,checkpoint:createRecoveryCheckpoint(journal)};
   }
  };
  const result=await plane.run(req(),store);
  expect(result).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
  expect(plane.snapshot()).toMatchObject({executionAuthorized:false,sideEffects:false});
 });
});
