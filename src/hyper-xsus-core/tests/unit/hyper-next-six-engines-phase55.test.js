import {describe,it,expect} from "vitest";
import {auditReviewRecoveryBatch} from "../../next-engines/orchestration/review-batch-security-audit.js";
const denied=()=>({state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const entry=i=>({requestId:"r"+i,traceId:"t"+i,assessment:denied()});
const batch=results=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results});
describe("Hyper phase 55 — bounded mixed batch and duplicate identity",()=>{
 it("audits 64 independent results without reordering",()=>{
  const result=auditReviewRecoveryBatch(batch(Array.from({length:64},(_,i)=>entry(i))));
  expect(result.state).toBe("audit_passed");
  expect(result.results).toHaveLength(64);
  expect(result.results.map(x=>x.requestId)).toEqual(
   Array.from({length:64},(_,i)=>"r"+i));
  expect(result.results.every(x=>x.assessment.executionAuthorized===false)).toBe(true);
 });
 it("blocks both occurrences of a duplicate identity",()=>{
  const result=auditReviewRecoveryBatch(batch([entry(1),entry(2),entry(1)]));
  expect(result.state).toBe("audit_blocked");
  expect(result.findings).toContain("DUPLICATE_REQUEST_IDENTITY");
  expect(result.results[0].assessment.errorCode).toBe("SECURITY_AUDIT_UNVERIFIED");
  expect(result.results[2].assessment.errorCode).toBe("SECURITY_AUDIT_UNVERIFIED");
  expect(result.results[1].assessment.errorCode).toBeUndefined();
 });
 it("keeps different traces of the same request distinct",()=>{
  const a=entry(1),b={...entry(2),requestId:"r1"};
  const result=auditReviewRecoveryBatch(batch([a,b]));
  expect(result.state).toBe("audit_passed");
 });
 it("isolates malformed entries in a mixed batch",()=>{
  const entries=Array.from({length:64},(_,i)=>entry(i));
  entries[7].assessment={...denied(),executionAuthorized:true};
  entries[29].assessment={...denied(),nextAction:"automatic_retry"};
  const result=auditReviewRecoveryBatch(batch(entries));
  expect(result.state).toBe("audit_blocked");
  expect(result.results[7].assessment.executionAuthorized).toBe(false);
  expect(result.results[29].assessment.retrySafe).toBe(false);
  expect(result.results[63].assessment.executionAuthorized).toBe(false);
  expect(result.findings).toContain("REQUEST_INVARIANT_VIOLATION");
 });
 it("rejects 65 entries before any audit work",()=>{
  expect(()=>auditReviewRecoveryBatch(batch(Array.from({length:65},(_,i)=>entry(i))))).toThrow();
 });
 it("blocks repeated identity even when the first assessment is invalid",()=>{
  const first=entry(4);first.assessment={...denied(),retrySafe:true};
  const result=auditReviewRecoveryBatch(batch([first,entry(4)]));
  expect(result.state).toBe("audit_blocked");
  expect(result.findings).toContain("DUPLICATE_REQUEST_IDENTITY");
  expect(result.results.every(x=>x.assessment.retrySafe===false)).toBe(true);
 });
});
