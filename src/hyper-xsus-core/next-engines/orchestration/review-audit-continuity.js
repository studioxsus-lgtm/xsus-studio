import {createHash} from "node:crypto";
import {auditReviewRecoveryBatch} from "./review-batch-security-audit.js";

const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const snapshot=batch=>{
 const audit=auditReviewRecoveryBatch(batch);
 const records=audit.results.map(({requestId,traceId,assessment})=>[
  requestId,traceId,assessment.state,assessment.nextAction,
  assessment.lockState??null,assessment.journalState??null,
  assessment.errorCode??null
 ]);
 return {audit,records,fingerprint:digest(records)};
};
/**
 * Phase 56: compare two independently audited read-only observations.
 * A matching fingerprint is not proof of atomicity or permission to recover.
 * No raw request identifiers are returned.
 */
export function compareReviewAuditContinuity({before,after}={}){
 const left=snapshot(before),right=snapshot(after);
 const findings=[];
 if(left.audit.state!=="audit_passed"||right.audit.state!=="audit_passed")
  findings.push("AUDIT_UNVERIFIED");
 if(left.records.length!==right.records.length)
  findings.push("RESULT_COUNT_CHANGED");
 const limit=Math.min(left.records.length,right.records.length);
 for(let i=0;i<limit;i++){
  const a=left.records[i],b=right.records[i];
  if(a[0]!==b[0]||a[1]!==b[1]){
   findings.push("REQUEST_IDENTITY_CHANGED");
   continue;
  }
  if(a.some((value,index)=>index>=2&&value!==b[index]))
   findings.push("ASSESSMENT_CHANGED");
 }
 const unchanged=findings.length===0&&left.fingerprint===right.fingerprint;
 if(!unchanged&&findings.length===0)findings.push("SNAPSHOT_CHANGED");
 return Object.freeze({
  state:unchanged?"continuity_observed":"continuity_blocked",
  beforeFingerprint:left.fingerprint,afterFingerprint:right.fingerprint,
  findings:Object.freeze([...new Set(findings)]),
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,
  nextAction:unchanged?"manual_review":"manual_investigation"
 });
}
