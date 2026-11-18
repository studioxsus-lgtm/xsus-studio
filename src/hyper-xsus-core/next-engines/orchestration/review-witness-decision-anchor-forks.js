import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionAnchorContinuity} from "./review-witness-decision-anchor-continuity.js";

const blocked=code=>Object.freeze({state:"witness_decision_anchor_forks_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe anchor candidate");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe anchor candidate field");
 return d.value;
};
const validId=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
/**
 * Phase 92: read-only comparison of 2-8 independently anchored histories.
 * Every candidate is authenticated with Phase 91 against itself first.
 * Conflicts are reported, not resolved. Trusted anchor references and
 * chronology must be established externally; no writes or authority granted.
 */
export function inspectReviewWitnessDecisionAnchorForks({
 anchors,expectedAnchorIds,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!Array.isArray(anchors)||!Array.isArray(expectedAnchorIds)||
  anchors.length<2||anchors.length>8||anchors.length!==expectedAnchorIds.length)
  throw new EngineContractError("INVALID_INPUT","Invalid anchor fork inspection configuration");
 try{
  const common={beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
   expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
   decision,reviewKey,expectedReviewerId,expectedDecisionId,
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds};
  const records=[],seen=new Set();
  for(let i=0;i<anchors.length;i++){
   const entry=Object.getOwnPropertyDescriptor(anchors,String(i));
   const id=Object.getOwnPropertyDescriptor(expectedAnchorIds,String(i));
   if(!entry||!("value" in entry)||!id||!("value" in id)||
    !validId(id.value)||seen.has(id.value))
    return blocked("ANCHOR_FORKS_INPUT_UNVERIFIED");
   seen.add(id.value);
   const record=entry.value;
   if(own(record,"anchorId")!==id.value)
    return blocked("ANCHOR_FORKS_CONTEXT_MISMATCH");
   const check=inspectReviewWitnessDecisionAnchorContinuity({
    ...common,earlier:record,later:record});
   if(check.state!=="witness_decision_anchor_duplicate_observed_for_manual_review")
    return blocked("ANCHOR_FORKS_AUTHENTICATION_UNVERIFIED");
   records.push(record);
  }
  let duplicates=0,extensions=0,competing=0;
  for(let i=0;i<records.length;i++){
   for(let j=i+1;j<records.length;j++){
    const first=records[i],second=records[j];
    const a=own(first,"observations").length,b=own(second,"observations").length;
    const result=inspectReviewWitnessDecisionAnchorContinuity({
     ...common,earlier:a<=b?first:second,later:a<=b?second:first});
    if(result.state==="witness_decision_anchor_duplicate_observed_for_manual_review")
     duplicates++;
    else if(result.state==="witness_decision_anchor_extension_observed_for_manual_review")
     extensions++;
    else if(result.findings?.includes("ANCHOR_COMPETING_HISTORY_DETECTED"))
     competing++;
    else return blocked("ANCHOR_FORKS_PAIR_UNVERIFIED");
   }
  }
  return Object.freeze({state:competing?
   "witness_decision_competing_anchors_observed_for_manual_review":
   "witness_decision_compatible_anchors_observed_for_manual_review",
   ledgerId,anchorCount:records.length,duplicatePairs:duplicates,
   extensionPairs:extensions,competingPairs:competing,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ANCHOR_FORKS_UNVERIFIED");}
}
