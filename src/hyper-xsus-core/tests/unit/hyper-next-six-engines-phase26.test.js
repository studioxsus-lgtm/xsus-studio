import {describe,it,expect} from "vitest";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createDecisionJournal,replayDecisionJournal} from "../../next-engines/orchestration/decision-journal.js";
import {createRecoveryCheckpoint} from "../../next-engines/orchestration/recovery-checkpoint.js";
import {auditReviewRecord} from "../../next-engines/orchestration/review-security-audit.js";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";

const req=(id="audit-26",trace="trace-26")=>({
 contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:trace,authorizationRef:"policy:test"}
});
const snapshot=()=>{
 const journal=createDecisionJournal(coordinateSixEngines(req()));
 return {recovered:true,executionAuthorized:false,journal,checkpoint:createRecoveryCheckpoint(journal)};
};
describe("Hyper six engines phase 26 — security and contract audit",()=>{
 it("accepts a valid review-only journal and returns minimal immutable metadata",()=>{
  const result=auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},snapshot());
  expect(result).toMatchObject({valid:true,completed:0,rejected:0,executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
  expect(Object.isFrozen(result)).toBe(true);
  expect(result).not.toHaveProperty("entries");
 });
 it("rejects a forged execution authorization flag",()=>{
  const forged={...snapshot(),executionAuthorized:true};
  expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},forged))
   .toThrowError(expect.objectContaining({code:"PERSISTENCE_UNVERIFIED"}));
 });
 it("rejects journal changes that would authorize execution or side effects",()=>{
  for(const patch of [{executionAuthorized:true},{sideEffects:true}]){
   const s=snapshot();s.journal={...s.journal,...patch};
   expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},s)).toThrow();
  }
 });
 it("rejects forged checkpoints and cross-request identity substitution",()=>{
  const bad=snapshot();bad.checkpoint={...bad.checkpoint,resumeExecution:true};
  expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},bad))
   .toThrowError(expect.objectContaining({code:"CHECKPOINT_MISMATCH"}));
  expect(()=>auditReviewRecord({requestId:"other",traceId:"trace-26"},snapshot()))
   .toThrowError(expect.objectContaining({code:"JOURNAL_CONFLICT"}));
  expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"other"},snapshot()))
   .toThrowError(expect.objectContaining({code:"JOURNAL_CONFLICT"}));
 });
 it("rejects malformed stage sequences and unknown stages",()=>{
  const s=snapshot();s.journal={...s.journal,entries:[{sequence:2,stage:"unknown",status:"success",code:null}]};
  expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},s))
   .toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("never returns stage payloads or principal authorization details",()=>{
  const s=snapshot();
  const report=auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},s);
  const serialized=JSON.stringify(report);
  expect(serialized).not.toContain("policy:test");
  expect(serialized).not.toContain("tester");
  expect(serialized).not.toContain("payload");
 });
 it("keeps the integrated control-plane snapshot non-authorizing",()=>{
  const plane=createReviewControlPlane();
  const report=plane.snapshot();
  expect(report).toMatchObject({executionAuthorized:false,sideEffects:false,circuit:{executionAuthorized:false}});
  expect(Object.isFrozen(report)).toBe(true);
 });
 it("validates required identifiers and recovery structure",()=>{
  expect(()=>auditReviewRecord({requestId:"",traceId:"trace-26"},snapshot())).toThrow();
  expect(()=>auditReviewRecord({requestId:"audit-26",traceId:"trace-26"},{recovered:true,executionAuthorized:false}))
   .toThrow();
  expect(replayDecisionJournal(snapshot().journal)).toMatchObject({executionAuthorized:false,sideEffects:false});
 });
});
