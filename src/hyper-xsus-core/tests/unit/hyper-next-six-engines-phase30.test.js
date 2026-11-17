import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {assessReviewReadiness} from "../../next-engines/orchestration/review-readiness.js";
import {auditReviewRecord} from "../../next-engines/orchestration/review-security-audit.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";
const req=(id="phase30")=>({
 contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}
});
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-phase30-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper six engines phase 30 — integrated readiness regression",()=>{
 it("persists, recovers, audits and assesses a valid review record",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane();
  const result=await plane.run(req(),store);
  expect(result).toMatchObject({recorded:true,executionAuthorized:false,sideEffects:false});
  const recovered=await store.load();
  const identity={requestId:"phase30",traceId:"trace-phase30"};
  expect(auditReviewRecord(identity,recovered)).toMatchObject({valid:true,executionAuthorized:false});
  const report=assessReviewReadiness({...identity,controlSnapshot:plane.snapshot(),recoveredSnapshot:recovered});
  expect(report).toMatchObject({status:"manual_review_required",journalVerified:true,productionReady:false,executionAuthorized:false,sideEffects:false});
  expect(await reconcileReviewRecord(identity,store)).toMatchObject({recorded:true,retrySafe:false});
 }));
 it("rejects unsafe input before any persistent write",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane();
  const input=req();input.payload.inputs.truth=JSON.parse('{"__proto__":{"polluted":true}}');
  await expect(plane.run(input,store)).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(await store.load()).toBeNull();
 }));
 it("does not treat a mismatched journal as a successful readiness assessment",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane();
  await plane.run(req(),store);
  const recovered=await store.load();
  expect(()=>assessReviewReadiness({
   requestId:"different",traceId:"trace-phase30",
   controlSnapshot:plane.snapshot(),recoveredSnapshot:recovered
  })).toThrowError(expect.objectContaining({code:"JOURNAL_CONFLICT"}));
 }));
 it("blocks readiness when circuit has opened after an operational persistence failure",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane({failureThreshold:1,cooldownMs:100000});
  await plane.run(req(),store);
  await expect(plane.run(req("failure"),{save:async()=>{throw Error("STORAGE_DOWN");},load:()=>store.load()})).rejects.toThrow("STORAGE_DOWN");
  const recovered=await store.load();
  const report=assessReviewReadiness({
   requestId:"phase30",traceId:"trace-phase30",
   controlSnapshot:plane.snapshot(),recoveredSnapshot:recovered
  });
  expect(report).toMatchObject({status:"review_blocked",productionReady:false});
  expect(report.blockers).toContain("CIRCUIT_NOT_CLOSED");
 }));
 it("never returns production authorization even after repeat successful reviews",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const plane=createReviewControlPlane();
  for(let i=0;i<5;i++){
   const result=await plane.run(req(),store);
   expect(result.executionAuthorized).toBe(false);
   expect(result.sideEffects).toBe(false);
  }
  const recovered=await store.load();
  const report=assessReviewReadiness({
   requestId:"phase30",traceId:"trace-phase30",
   controlSnapshot:plane.snapshot(),recoveredSnapshot:recovered
  });
  expect(report.productionReady).toBe(false);
  expect(report.nextAction).toBe("manual_review");
 }));
});
