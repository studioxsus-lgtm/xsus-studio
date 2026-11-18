import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const blocked=code=>Object.freeze({state:"checkpoint_freshness_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe checkpoint");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe checkpoint property");
 return d.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
/**
 * Phase 72: compare an authenticated checkpoint against a caller-provided,
 * independently trusted monotonic freshness floor and replay ledger.
 * This is read-only and does not authenticate the ledger, establish wall
 * clock freshness, or durably record a new acceptance. The trusted provider
 * must atomically persist accepted checkpoint identities and sequence floors.
 */
export function inspectReviewCheckpointFreshness({
 checkpoint,checkpointId,minimumSequence,expectedDigest,key,
 previouslyAcceptedCheckpointIds=[],maxAcceptedIds=10000
}={}){
 if(!id(checkpointId)||!seq(minimumSequence)||!hex(expectedDigest)||
  !Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !Number.isSafeInteger(maxAcceptedIds)||maxAcceptedIds<1||
  maxAcceptedIds>10000||!Array.isArray(previouslyAcceptedCheckpointIds)||
  previouslyAcceptedCheckpointIds.length>maxAcceptedIds)
  throw new EngineContractError("INVALID_INPUT","Invalid checkpoint freshness configuration");
 try{
  const seen=new Set();
  for(let i=0;i<previouslyAcceptedCheckpointIds.length;i++){
   const d=Object.getOwnPropertyDescriptor(previouslyAcceptedCheckpointIds,String(i));
   if(!d||!("value" in d)||!id(d.value)||seen.has(d.value))
    return blocked("CHECKPOINT_LEDGER_UNVERIFIED");
   seen.add(d.value);
  }
  if(seen.has(checkpointId))return blocked("CHECKPOINT_REPLAYED");
  const sequence=own(checkpoint,"sequence");
  const digest=own(checkpoint,"registryDigest");
  if(!seq(sequence)||!hex(digest))
   return blocked("CHECKPOINT_UNVERIFIED");
  const result=verifyReviewReplayRollbackAnchor({
   anchor:checkpoint,registryDigest:expectedDigest,minimumSequence,key});
  if(result.state!=="rollback_anchor_verified")
   return blocked(result.findings?.[0]??"CHECKPOINT_UNVERIFIED");
  if(sequence!==result.sequence||digest!==expectedDigest)
   return blocked("CHECKPOINT_CONTEXT_MISMATCH");
  return Object.freeze({state:"checkpoint_freshness_observed_for_manual_review",
   checkpointId,sequence,registryDigest:digest,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("CHECKPOINT_FRESHNESS_UNVERIFIED");}
}
