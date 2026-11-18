import {EngineContractError} from "../contracts.js";
import {createReviewReplayRollbackAnchor,verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const digest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const sequence=x=>Number.isSafeInteger(x)&&x>=0;
const blocked=code=>Object.freeze({state:"anchor_transition_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe anchor");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe anchor");
 return d.value;
};
/**
 * Phase 65: caller-controlled monotonic anchor transition proposal.
 * Pure validation: never commits either registry or anchor. The external
 * trusted anchor store MUST implement atomic compare-and-swap with expected
 * sequence and tag, durable ordering and manual crash reconciliation.
 * This is NOT an atomic cross-store transaction.
 */
export function proposeReviewAnchorTransition({
 currentAnchor,currentDigest,nextDigest,key,minimumSequence=0
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !sequence(minimumSequence)||!digest(currentDigest)||!digest(nextDigest))
  throw new EngineContractError("INVALID_INPUT","Invalid anchor transition configuration");
 const verified=verifyReviewReplayRollbackAnchor({
  anchor:currentAnchor,registryDigest:currentDigest,minimumSequence,key});
 if(verified.state!=="rollback_anchor_verified")
  return blocked(verified.findings[0]??"ANCHOR_UNVERIFIED");
 let currentTag;
 try{currentTag=own(currentAnchor,"authenticationTag");}
 catch{return blocked("ANCHOR_UNVERIFIED");}
 if(verified.sequence===Number.MAX_SAFE_INTEGER)
  return blocked("SEQUENCE_EXHAUSTED");
 if(currentDigest===nextDigest)return blocked("NO_REGISTRY_CHANGE");
 const nextAnchor=createReviewReplayRollbackAnchor({
  version:verified.sequence+1,digest:nextDigest,key});
 return Object.freeze({state:"transition_proposed",
  expectedSequence:verified.sequence,expectedTag:currentTag,
  nextAnchor,recoveryAuthorized:false,deletionAuthorized:false,
  retrySafe:false,executionAuthorized:false,sideEffects:false,
  nextAction:"manual_review"});
}
/**
 * Validate the observed anchor after a caller-performed external CAS.
 * A matching observation is not proof that the registry was durably written.
 */
export function inspectReviewAnchorTransition({
 proposal,observedAnchor,key
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096)
  throw new EngineContractError("INVALID_INPUT","Invalid transition inspection key");
 try{
  if(own(proposal,"state")!=="transition_proposed")
   return blocked("PROPOSAL_UNVERIFIED");
  const expected=own(proposal,"nextAnchor");
  const nextSequence=own(expected,"sequence");
  const nextDigest=own(expected,"registryDigest");
  const nextTag=own(expected,"authenticationTag");
  if(!sequence(nextSequence)||!digest(nextDigest)||typeof nextTag!=="string")
   return blocked("PROPOSAL_UNVERIFIED");
  const result=verifyReviewReplayRollbackAnchor({
   anchor:observedAnchor,registryDigest:nextDigest,
   minimumSequence:nextSequence,key});
  if(result.state!=="rollback_anchor_verified")
   return blocked(result.findings[0]??"ANCHOR_UNVERIFIED");
  if(result.sequence!==nextSequence||
   own(observedAnchor,"authenticationTag")!==nextTag)
   return blocked("ANCHOR_TRANSITION_MISMATCH");
  return Object.freeze({state:"anchor_transition_observed",
   sequence:nextSequence,recoveryAuthorized:false,deletionAuthorized:false,
   retrySafe:false,executionAuthorized:false,sideEffects:false,
   nextAction:"manual_review"});
 }catch{return blocked("ANCHOR_TRANSITION_UNVERIFIED");}
}
