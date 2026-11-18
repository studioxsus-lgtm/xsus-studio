import {describe,it,expect} from "vitest";
import {auditReviewRecoveryBatch} from "../../next-engines/orchestration/review-batch-security-audit.js";
const assessment={state:"review_blocked",recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"};
const batch=item=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[item]});
const entry=value=>({requestId:"r",traceId:"t",assessment:value});
describe("Hyper phase 52 — defensive audit of untrusted structures",()=>{
 it("rejects an accessor assessment without evaluating it",()=>{
  let invoked=0;
  const item=entry(assessment);
  Object.defineProperty(item,"assessment",{get(){invoked++;throw Error("untrusted getter");}});
  const result=auditReviewRecoveryBatch(batch(item));
  expect(invoked).toBe(0);
  expect(result.state).toBe("audit_blocked");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("rejects an accessor on a security-critical field",()=>{
  let invoked=0;
  const value={...assessment};
  Object.defineProperty(value,"executionAuthorized",{get(){invoked++;return false;}});
  const result=auditReviewRecoveryBatch(batch(entry(value)));
  expect(invoked).toBe(0);
  expect(result.state).toBe("audit_blocked");
 });
 it("does not propagate untrusted extra fields into approved results",()=>{
  const value={...assessment,secret:"must-not-leak",executionToken:"danger"};
  const result=auditReviewRecoveryBatch(batch(entry(value)));
  expect(result.state).toBe("audit_passed");
  expect(JSON.stringify(result)).not.toContain("must-not-leak");
  expect(result.results[0].assessment).not.toHaveProperty("executionToken");
 });
 it("rejects inherited or exotic result objects",()=>{
  const value=Object.create({executionAuthorized:false});
  Object.assign(value,assessment);
  const result=auditReviewRecoveryBatch(batch(entry(value)));
  expect(result.state).toBe("audit_blocked");
 });
 it("rejects sparse arrays and keeps results fail-closed",()=>{
  const input=batch(entry(assessment));
  input.results=new Array(1);
  const result=auditReviewRecoveryBatch(input);
  expect(result.state).toBe("audit_blocked");
  expect(result.results[0].assessment.retrySafe).toBe(false);
 });
 it("rejects oversized result arrays before inspecting entries",()=>{
  const input=batch(entry(assessment));
  input.results=new Array(65);
  expect(()=>auditReviewRecoveryBatch(input)).toThrow();
 });
});
