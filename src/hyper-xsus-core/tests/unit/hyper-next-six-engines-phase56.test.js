import {describe,it,expect} from "vitest";
import {compareReviewAuditContinuity} from "../../next-engines/orchestration/review-audit-continuity.js";
const assessment=(extra={})=>({state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation",...extra});
const item=(id,extra={})=>({requestId:id,traceId:"trace-"+id,assessment:assessment(extra)});
const batch=results=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results});
const compare=(before,after)=>compareReviewAuditContinuity({before:batch(before),after:batch(after)});
const denied=result=>expect(result).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 56 — audited snapshot continuity",()=>{
 it("recognizes equal independent snapshots without authorizing recovery",()=>{
  const result=compare([item("a"),item("b")],[item("a"),item("b")]);
  expect(result.state).toBe("continuity_observed");
  expect(result.beforeFingerprint).toBe(result.afterFingerprint);
  expect(result.findings).toEqual([]);
  denied(result);
 });
 it("blocks a changed assessment state or metadata",()=>{
  const result=compare([item("a")],[item("a",{errorCode:"NEW_ERROR"})]);
  expect(result.state).toBe("continuity_blocked");
  expect(result.findings).toContain("ASSESSMENT_CHANGED");
  denied(result);
 });
 it("blocks reordered request identities",()=>{
  const result=compare([item("a"),item("b")],[item("b"),item("a")]);
  expect(result.findings).toContain("REQUEST_IDENTITY_CHANGED");
  denied(result);
 });
 it("blocks added or removed results",()=>{
  const result=compare([item("a")],[item("a"),item("b")]);
  expect(result.findings).toContain("RESULT_COUNT_CHANGED");
  denied(result);
 });
 it("blocks invalid snapshots even when both have the same invalid content",()=>{
  const invalid=item("a",{executionAuthorized:true});
  const result=compare([invalid],[invalid]);
  expect(result.findings).toContain("AUDIT_UNVERIFIED");
  expect(result.state).toBe("continuity_blocked");
  denied(result);
 });
 it("does not expose raw request identity in comparison output",()=>{
  const secret="private-identifier-123";
  const result=compare([item(secret)],[item(secret)]);
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(result.beforeFingerprint).toMatch(/^[a-f0-9]{64}$/);
  denied(result);
 });
});
