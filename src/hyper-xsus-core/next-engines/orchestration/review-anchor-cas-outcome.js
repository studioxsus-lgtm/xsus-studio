import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const denied=(code)=>Object.freeze({state:"cas_outcome_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const own=(object,key)=>{
 if(!object||typeof object!=="object"||Array.isArray(object))
  throw Error("Invalid record");
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!("value" in descriptor))throw Error("Unsafe record");
 return descriptor.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const sequence=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 67: independent, read-only assessment of a trusted CAS provider's
 * result. Provider status is an assertion, not evidence of durability.
 * No CAS, retries, recovery, or registry writes are performed.
 */
export function inspectReviewAnchorCasOutcome({
 proposal,providerOutcome,observedAnchor,key
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096)
  throw new EngineContractError("INVALID_INPUT","Invalid CAS outcome key");
 try{
  if(own(proposal,"state")!=="transition_proposed")
   return denied("PROPOSAL_UNVERIFIED");
  const expectedSequence=own(proposal,"expectedSequence");
  const expectedTag=own(proposal,"expectedTag");
  const nextAnchor=own(proposal,"nextAnchor");
  const nextSequence=own(nextAnchor,"sequence");
  const nextDigest=own(nextAnchor,"registryDigest");
  const nextTag=own(nextAnchor,"authenticationTag");
  if(!sequence(expectedSequence)||expectedSequence===Number.MAX_SAFE_INTEGER||
   !hex(expectedTag)||nextSequence!==expectedSequence+1||
   !hex(nextDigest)||!hex(nextTag))
   return denied("PROPOSAL_UNVERIFIED");
  const verified=verifyReviewReplayRollbackAnchor({
   anchor:nextAnchor,registryDigest:nextDigest,minimumSequence:nextSequence,key});
  if(verified.state!=="rollback_anchor_verified"||
   verified.sequence!==nextSequence)
   return denied("PROPOSAL_UNVERIFIED");
  const status=own(providerOutcome,"status");
  if(status==="conflict")return denied("CAS_CONFLICT");
  if(status==="interrupted")return denied("CAS_INTERRUPTED");
  if(status!=="applied")return denied("CAS_OUTCOME_UNVERIFIED");
  if(own(providerOutcome,"expectedSequence")!==expectedSequence||
   own(providerOutcome,"expectedTag")!==expectedTag)
   return denied("CAS_PRECONDITION_MISMATCH");
  const observed=verifyReviewReplayRollbackAnchor({
   anchor:observedAnchor,registryDigest:nextDigest,
   minimumSequence:nextSequence,key});
  if(observed.state!=="rollback_anchor_verified")
   return denied(observed.findings?.[0]??"OBSERVED_ANCHOR_UNVERIFIED");
  if(observed.sequence!==nextSequence||
   own(observedAnchor,"authenticationTag")!==nextTag)
   return denied("CAS_OBSERVATION_MISMATCH");
  return Object.freeze({state:"cas_outcome_observed_for_manual_review",
   sequence:nextSequence,registryDigest:nextDigest,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return denied("CAS_OUTCOME_UNVERIFIED");}
}
