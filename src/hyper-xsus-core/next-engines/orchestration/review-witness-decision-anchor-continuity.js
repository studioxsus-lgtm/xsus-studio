import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionHistoryAnchor} from "./review-witness-decision-history-anchor.js";

const blocked=code=>Object.freeze({state:"witness_decision_anchor_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe anchor");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe anchor field");
 return d.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const canonical=x=>{
 const list=own(x,"consumedDecisionIds"),ledgerId=own(x,"ledgerId");
 const revision=own(x,"revision"),minimumRevision=own(x,"minimumRevision");
 if(!id(ledgerId)||!seq(revision)||!seq(minimumRevision)||
  !Array.isArray(list)||list.length>10000)throw Error("Unsafe registry");
 const ids=new Set();
 for(let i=0;i<list.length;i++){
  const d=Object.getOwnPropertyDescriptor(list,String(i));
  if(!d||!("value" in d)||!id(d.value)||ids.has(d.value))throw Error("Unsafe ID");
  ids.add(d.value);
 }
 return JSON.stringify([ledgerId,revision,minimumRevision,[...ids].sort()]);
};
const prefix=(shorter,longer)=>{
 if(!Array.isArray(shorter)||!Array.isArray(longer)||shorter.length>longer.length)
  return false;
 for(let i=0;i<shorter.length;i++){
  const a=Object.getOwnPropertyDescriptor(shorter,String(i));
  const b=Object.getOwnPropertyDescriptor(longer,String(i));
  if(!a||!("value" in a)||!b||!("value" in b))throw Error("Sparse history");
  const ar=own(a.value,"receipt"),br=own(b.value,"receipt");
  if(canonical(own(a.value,"registry"))!==canonical(own(b.value,"registry"))||
   own(ar,"authenticationTag")!==own(br,"authenticationTag")||
   own(ar,"epochId")!==own(br,"epochId")||
   own(ar,"attemptId")!==own(br,"attemptId")||
   own(ar,"decisionId")!==own(br,"decisionId"))
   return false;
 }
 return true;
};
/**
 * Phase 91: compare TWO independently trusted, fully authenticated
 * restart-history anchors. Shared history must be byte-equivalent after
 * canonicalization; divergent authenticated histories require manual review.
 * This does not select an authoritative history, persist anchors or perform CAS.
 */
export function inspectReviewWitnessDecisionAnchorContinuity({
 earlier,later,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 try{
  const a=own(earlier,"observations"),b=own(later,"observations");
  const ea=own(earlier,"expectedEpochIds"),eb=own(later,"expectedEpochIds");
  if(!Array.isArray(a)||!Array.isArray(b)||a.length<2||b.length<2||
   a.length>32||b.length>32||!Array.isArray(ea)||!Array.isArray(eb))
   return blocked("ANCHOR_CONTINUITY_INPUT_UNVERIFIED");
  const common={beforeRegistry,afterRegistry,receipt,authorityKey,
   expectedAttemptId,expectedBeforeEpochId,expectedRegistryRevision,
   expectedMinimumRevision,decision,reviewKey,expectedReviewerId,
   expectedDecisionId,previousRounds,previousChain,trustedPreviousHeadTag,
   trustedPreviousRoundCount,candidates,ledgerId,ledgerKey,chainKey,
   startingRevision,minimumSequence,requiredWitnesses,maxWitnesses,maxRounds,
   maxObservations:32};
  const verify=record=>inspectReviewWitnessDecisionHistoryAnchor({
   ...common,observations:own(record,"observations"),
   expectedEpochIds:own(record,"expectedEpochIds"),
   anchor:own(record,"anchor"),anchorKey:own(record,"anchorKey"),
   trustedAnchorTag:own(record,"trustedAnchorTag"),
   trustedObservationCount:own(record,"trustedObservationCount")});
  if(verify(earlier).state!=="witness_decision_history_anchor_observed_for_manual_review"||
   verify(later).state!=="witness_decision_history_anchor_observed_for_manual_review")
   return blocked("ANCHOR_CONTINUITY_AUTHENTICATION_UNVERIFIED");
  if(a.length>b.length)return blocked("ANCHOR_CONTINUITY_TRUNCATION");
  for(let i=0;i<ea.length;i++){
   const x=Object.getOwnPropertyDescriptor(ea,String(i));
   const y=Object.getOwnPropertyDescriptor(eb,String(i));
   if(!x||!("value" in x)||!y||!("value" in y))
    return blocked("ANCHOR_CONTINUITY_SPARSE");
   if(x.value!==y.value)return blocked("ANCHOR_COMPETING_HISTORY_DETECTED");
  }
  if(!prefix(a,b))return blocked("ANCHOR_COMPETING_HISTORY_DETECTED");
  return Object.freeze({state:a.length===b.length?
   "witness_decision_anchor_duplicate_observed_for_manual_review":
   "witness_decision_anchor_extension_observed_for_manual_review",
   ledgerId,earlierCount:a.length,laterCount:b.length,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ANCHOR_CONTINUITY_UNVERIFIED");}
}
