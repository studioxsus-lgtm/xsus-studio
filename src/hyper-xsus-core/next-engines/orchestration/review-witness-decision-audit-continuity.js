import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAuditAuthentication} from "./review-witness-decision-audit-authentication.js";

const blocked=code=>Object.freeze({state:"witness_decision_audit_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe audit continuity input");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe audit continuity field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 95: read-only sequential authenticated audit verification.
 * Trusted expected IDs and sequence bounds MUST originate outside this
 * input. The function cannot establish completeness or independent custody.
 * A changed report digest is not automatically a fork: audit inputs may evolve.
 */
export function inspectReviewWitnessDecisionAuditContinuity({
 records,expectedReportIds,expectedFirstSequence,expectedLastSequence,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!Array.isArray(records)||!Array.isArray(expectedReportIds)||
  records.length<2||records.length>16||
  records.length!==expectedReportIds.length||
  !seq(expectedFirstSequence)||!seq(expectedLastSequence)||
  expectedLastSequence-expectedFirstSequence!==records.length-1)
  throw new EngineContractError("INVALID_INPUT","Invalid audit continuity configuration");
 try{
  const seen=new Set(),digests=new Set();
  const common={beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
   expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
   decision,reviewKey,expectedReviewerId,expectedDecisionId,
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds};
  let issuer=null;
  for(let i=0;i<records.length;i++){
   const d=Object.getOwnPropertyDescriptor(records,String(i));
   const e=Object.getOwnPropertyDescriptor(expectedReportIds,String(i));
   if(!d||!("value" in d)||!e||!("value" in e)||!id(e.value)||
    seen.has(e.value))return blocked("AUDIT_CONTINUITY_REPLAY");
   seen.add(e.value);
   const record=d.value,sequence=own(record,"sequence");
   if(sequence!==expectedFirstSequence+i)
    return blocked("AUDIT_CONTINUITY_SEQUENCE_GAP");
   const expectedIssuerId=own(record,"expectedIssuerId");
   if(!id(expectedIssuerId)||issuer!==null&&issuer!==expectedIssuerId)
    return blocked("AUDIT_CONTINUITY_ISSUER_MISMATCH");
   issuer=expectedIssuerId;
   const verdict=inspectReviewWitnessDecisionAuditAuthentication({
    ...common,report:own(record,"report"),authentication:own(record,"authentication"),
    auditKey:own(record,"auditKey"),expectedIssuerId,
    expectedReportId:e.value,anchors:own(record,"anchors"),
    expectedAnchorIds:own(record,"expectedAnchorIds")});
   if(verdict.state!=="witness_decision_audit_authenticated_for_manual_review")
    return blocked("AUDIT_CONTINUITY_AUTHENTICATION_UNVERIFIED");
   digests.add(verdict.reportDigest);
  }
  return Object.freeze({state:"witness_decision_audit_continuity_observed_for_manual_review",
   reportCount:records.length,firstSequence:expectedFirstSequence,
   lastSequence:expectedLastSequence,distinctReportDigests:digests.size,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("AUDIT_CONTINUITY_UNVERIFIED");}
}
