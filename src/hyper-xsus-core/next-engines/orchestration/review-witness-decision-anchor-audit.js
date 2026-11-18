import {createHash} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAnchorForks} from "./review-witness-decision-anchor-forks.js";

const blocked=code=>Object.freeze({state:"witness_decision_anchor_audit_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe audit input");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe audit field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const hash=x=>createHash("sha256").update(x).digest("hex");
/**
 * Phase 93: bounded, deterministic and redacted audit of authenticated
 * anchor comparisons. No keys, raw receipts, reviewer IDs or registry data
 * are copied to the report. Hashes are correlators, not anonymization.
 * The report is an observation, NOT an independently signed audit record.
 */
export function inspectReviewWitnessDecisionAnchorAudit({
 anchors,expectedAnchorIds,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!id(ledgerId)||!id(expectedDecisionId))
  throw new EngineContractError("INVALID_INPUT","Invalid anchor audit context");
 try{
  const verdict=inspectReviewWitnessDecisionAnchorForks({
   anchors,expectedAnchorIds,beforeRegistry,afterRegistry,receipt,authorityKey,
   expectedAttemptId,expectedBeforeEpochId,expectedRegistryRevision,
   expectedMinimumRevision,decision,reviewKey,expectedReviewerId,
   expectedDecisionId,previousRounds,previousChain,trustedPreviousHeadTag,
   trustedPreviousRoundCount,candidates,ledgerId,ledgerKey,chainKey,
   startingRevision,minimumSequence,requiredWitnesses,maxWitnesses,maxRounds});
  if(!["witness_decision_competing_anchors_observed_for_manual_review",
   "witness_decision_compatible_anchors_observed_for_manual_review"].includes(verdict.state))
   return blocked("ANCHOR_AUDIT_EVIDENCE_UNVERIFIED");
  const references=[];
  for(let i=0;i<anchors.length;i++){
   const entry=Object.getOwnPropertyDescriptor(anchors,String(i));
   const expected=Object.getOwnPropertyDescriptor(expectedAnchorIds,String(i));
   if(!entry||!("value" in entry)||!expected||!("value" in expected)||
    !id(expected.value))return blocked("ANCHOR_AUDIT_INPUT_UNVERIFIED");
   const anchor=own(entry.value,"anchor");
   const tag=own(anchor,"authenticationTag");
   if(!hex(tag))return blocked("ANCHOR_AUDIT_ANCHOR_UNVERIFIED");
   references.push(Object.freeze({
    referenceDigest:hash("XSUS_ANCHOR_AUDIT_REF_V1:"+ledgerId+":"+expected.value+":"+tag),
    observationCount:own(anchor,"observationCount")
   }));
  }
  const sorted=references.slice().sort((a,b)=>a.referenceDigest.localeCompare(b.referenceDigest));
  const reportDigest=hash(JSON.stringify(["XSUS_ANCHOR_AUDIT_REPORT_V1",
   verdict.anchorCount,verdict.duplicatePairs,verdict.extensionPairs,
   verdict.competingPairs,sorted.map(x=>[x.referenceDigest,x.observationCount])]));
  return Object.freeze({state:"witness_decision_anchor_audit_observed_for_manual_review",
   classification:verdict.competingPairs?"competing":"compatible",
   anchorCount:verdict.anchorCount,duplicatePairs:verdict.duplicatePairs,
   extensionPairs:verdict.extensionPairs,competingPairs:verdict.competingPairs,
   references:Object.freeze(sorted),reportDigest,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ANCHOR_AUDIT_UNVERIFIED");}
}
