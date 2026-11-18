import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAuditContinuity} from "./review-witness-decision-audit-continuity.js";
import {inspectReviewWitnessDecisionAuditAuthentication} from "./review-witness-decision-audit-authentication.js";

const blocked=code=>Object.freeze({state:"witness_decision_audit_checkpoints_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe checkpoint input");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe checkpoint field");
 return d.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
/**
 * Phase 97: require independently trusted, position-bound report digests.
 * A trusted checkpoint list MUST come from a separate authority or storage
 * channel; caller-supplied matching digests alone do not prove freshness.
 * No writes, recovery, deletion or execution are authorized.
 */
export function inspectReviewWitnessDecisionAuditCheckpoints({
 expectedReportDigests,...context
}={}){
 if(!Array.isArray(expectedReportDigests)||!Array.isArray(context.records)||
  expectedReportDigests.length!==context.records.length||
  expectedReportDigests.length<2||expectedReportDigests.length>16)
  throw new EngineContractError("INVALID_INPUT","Invalid trusted audit checkpoint configuration");
 try{
  const continuity=inspectReviewWitnessDecisionAuditContinuity(context);
  if(continuity.state!=="witness_decision_audit_continuity_observed_for_manual_review")
   return blocked("AUDIT_CHECKPOINT_CONTINUITY_UNVERIFIED");
  const {records,expectedReportIds,auditKey,expectedIssuerId,...common}=context;
  for(let i=0;i<records.length;i++){
   const expected=Object.getOwnPropertyDescriptor(expectedReportDigests,String(i));
   const record=Object.getOwnPropertyDescriptor(records,String(i));
   const reportId=Object.getOwnPropertyDescriptor(expectedReportIds,String(i));
   if(!expected||!("value" in expected)||!hex(expected.value)||
    !record||!("value" in record)||!reportId||!("value" in reportId))
    return blocked("AUDIT_CHECKPOINT_INPUT_UNVERIFIED");
   const item=record.value;
   const result=inspectReviewWitnessDecisionAuditAuthentication({
    ...common,report:own(item,"report"),authentication:own(item,"authentication"),
    auditKey,expectedIssuerId,expectedReportId:reportId.value,
    anchors:own(item,"anchors"),expectedAnchorIds:own(item,"expectedAnchorIds")});
   if(result.state!=="witness_decision_audit_authenticated_for_manual_review")
    return blocked("AUDIT_CHECKPOINT_AUTHENTICATION_UNVERIFIED");
   if(result.reportDigest!==expected.value)
    return blocked("AUDIT_CHECKPOINT_DIGEST_MISMATCH");
  }
  return Object.freeze({state:"witness_decision_audit_checkpoints_observed_for_manual_review",
   reportCount:records.length,firstSequence:continuity.firstSequence,
   lastSequence:continuity.lastSequence,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("AUDIT_CHECKPOINT_UNVERIFIED");}
}
