import {describe,it,expect} from "vitest";
import {auditReviewRecoveryBatch} from "../../next-engines/orchestration/review-batch-security-audit.js";
const assessment=()=>({state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const audit=value=>auditReviewRecoveryBatch({state:"manual_review_only",
 executionAuthorized:false,retrySafe:false,sideEffects:false,
 results:[{requestId:"r",traceId:"t",assessment:value}]});
describe("Hyper phase 54 — bounded metadata and state-action integrity",()=>{
 it("blocks nested objects in optional metadata without exposing them",()=>{
  const result=audit({...assessment(),errorCode:{secret:"do-not-copy"}});
  expect(result.state).toBe("audit_blocked");
  expect(JSON.stringify(result)).not.toContain("do-not-copy");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("blocks accessor metadata without invoking its getter",()=>{
  let calls=0;
  const value=assessment();
  Object.defineProperty(value,"journalState",{get(){calls++;return "observed";}});
  expect(audit(value).state).toBe("audit_blocked");
  expect(calls).toBe(0);
 });
 it("blocks mismatched recorded state and manual investigation action",()=>{
  expect(audit({...assessment(),state:"recorded_for_manual_review"}).state)
   .toBe("audit_blocked");
 });
 it("blocks mismatched blocked state and manual review action",()=>{
  expect(audit({...assessment(),nextAction:"manual_review"}).state)
   .toBe("audit_blocked");
 });
 it("rejects excessively long metadata",()=>{
  expect(audit({...assessment(),lockState:"x".repeat(129)}).state)
   .toBe("audit_blocked");
 });
 it("accepts bounded valid metadata and preserves manual-only constraints",()=>{
  const result=audit({...assessment(),lockState:"not_observed",
   journalState:"unverified",errorCode:"ASSESSMENT_INTERRUPTED"});
  expect(result.state).toBe("audit_passed");
  expect(result.results[0].assessment).toMatchObject({
   errorCode:"ASSESSMENT_INTERRUPTED",executionAuthorized:false,retrySafe:false});
 });
});
