import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessConflictDecision} from "./review-witness-conflict-decision.js";

const blocked=code=>Object.freeze({state:"witness_decision_replay_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe replay record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe replay field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 86: read-only replay/freshness preflight over a caller-supplied,
 * independently trusted snapshot. No reservation, CAS, persistence or
 * actual single-use enforcement is performed here. The external authority
 * must atomically consume the decision ID and maintain a monotonic floor.
 */
export function inspectReviewWitnessDecisionReplay({
 trustedRegistry,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!seq(expectedRegistryRevision)||!seq(expectedMinimumRevision)||
  !id(expectedDecisionId)||!id(ledgerId))
  throw new EngineContractError("INVALID_INPUT","Invalid decision replay preflight configuration");
 try{
  const registryLedger=own(trustedRegistry,"ledgerId");
  const registryRevision=own(trustedRegistry,"revision");
  const registryFloor=own(trustedRegistry,"minimumRevision");
  const used=own(trustedRegistry,"consumedDecisionIds");
  if(registryLedger!==ledgerId||!seq(registryRevision)||
   !seq(registryFloor)||registryRevision!==expectedRegistryRevision||
   registryFloor!==expectedMinimumRevision)
   return blocked("DECISION_REPLAY_REGISTRY_CONTEXT_MISMATCH");
  if(!Array.isArray(used)||used.length>10000)
   return blocked("DECISION_REPLAY_REGISTRY_UNVERIFIED");
  const seen=new Set();
  for(let i=0;i<used.length;i++){
   const d=Object.getOwnPropertyDescriptor(used,String(i));
   if(!d||!("value" in d)||!id(d.value)||seen.has(d.value))
    return blocked("DECISION_REPLAY_REGISTRY_UNVERIFIED");
   seen.add(d.value);
  }
  if(seen.has(expectedDecisionId))
   return blocked("DECISION_ALREADY_CONSUMED");
  const baseRevision=startingRevision+trustedPreviousRoundCount-1;
  if(!seq(startingRevision)||!seq(trustedPreviousRoundCount)||
   !Number.isSafeInteger(baseRevision)||baseRevision<registryFloor)
   return blocked("DECISION_REPLAY_STALE_BASE");
  const verified=inspectReviewWitnessConflictDecision({
   decision,reviewKey,expectedReviewerId,expectedDecisionId,
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds});
  if(verified.state!=="witness_conflict_decision_observed_for_manual_review")
   return blocked("DECISION_REPLAY_AUTHENTICATION_UNVERIFIED");
  return Object.freeze({state:"witness_decision_replay_preflight_observed_for_manual_review",
   ledgerId,decisionId:expectedDecisionId,registryRevision,
   minimumRevision:registryFloor,baseRevision,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("DECISION_REPLAY_UNVERIFIED");}
}
