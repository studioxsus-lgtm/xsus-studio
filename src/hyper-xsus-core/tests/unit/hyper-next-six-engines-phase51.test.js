import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditReviewRecoveryBatch,assessAndAuditReviewRecoveryBatch} from "../../next-engines/orchestration/review-batch-security-audit.js";
const blocked={state:"review_blocked",recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"};
const base=results=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results});
const entry=(assessment=blocked)=>({requestId:"r",traceId:"t",assessment});
describe("Hyper phase 51 — integrated fail-closed batch audit",()=>{
 it("accepts a valid review-only batch without authorizing anything",()=>{
  const result=auditReviewRecoveryBatch(base([entry()]));
  expect(result).toMatchObject({state:"audit_passed",executionAuthorized:false,
   recoveryAuthorized:false,retrySafe:false,sideEffects:false,findings:[]});
  expect(result.results[0].assessment).toEqual(blocked);
 });
 it("blocks forged execution authorization in a request",()=>{
  const result=auditReviewRecoveryBatch(base([entry({...blocked,executionAuthorized:true})]));
  expect(result.state).toBe("audit_blocked");
  expect(result.findings).toContain("REQUEST_INVARIANT_VIOLATION");
  expect(result.results[0].assessment).toMatchObject({state:"review_blocked",
   executionAuthorized:false,recoveryAuthorized:false,retrySafe:false});
 });
 it("blocks forged batch-level authorization and sanitizes all entries",()=>{
  const result=auditReviewRecoveryBatch({...base([entry()]),executionAuthorized:true});
  expect(result.state).toBe("audit_blocked");
  expect(result.findings).toContain("BATCH_INVARIANT_VIOLATION");
  expect(result.results[0].assessment.errorCode).toBe("SECURITY_AUDIT_UNVERIFIED");
 });
 it("does not permit unrecognized assessment states",()=>{
  const result=auditReviewRecoveryBatch(base([entry({...blocked,state:"executed"})]));
  expect(result.state).toBe("audit_blocked");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("rejects invalid audit input",()=>{
  expect(()=>auditReviewRecoveryBatch({results:null})).toThrow();
 });
 it("audits a real bounded concurrent recovery batch",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"xsus-phase51-"));
  try{
   const result=await assessAndAuditReviewRecoveryBatch({
    filePath:join(dir,"journal.json"),store:{load:async()=>null},
    requests:[{requestId:"r1",traceId:"t1"},{requestId:"r2",traceId:"t2"}],
    maxConcurrent:1,batchTimeoutMs:5000
   });
   expect(result.state).toBe("audit_passed");
   expect(result.results).toHaveLength(2);
   expect(result.results.every(x=>x.assessment.executionAuthorized===false)).toBe(true);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
});
