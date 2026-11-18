import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";
import {inspectReviewDurabilityTransitionHistory} from "./review-durability-transition-history.js";

const blocked=code=>Object.freeze({state:"durability_checkpoint_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const own=(object,name)=>{
 if(!object||typeof object!=="object"||Array.isArray(object))throw Error("Unsafe checkpoint");
 const descriptor=Object.getOwnPropertyDescriptor(object,name);
 if(!descriptor||!("value" in descriptor))throw Error("Unsafe checkpoint field");
 return descriptor.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 71: bind an authenticated, contiguous history segment to independently
 * trusted start/end anchors. Caller MUST obtain both anchors from a trusted
 * external monotonic store and enforce their freshness. The function is
 * read-only, cannot prove durable I/O, and never authorizes recovery.
 */
export function inspectReviewDurabilityCheckpoint({
 records,startingAnchor,endingAnchor,key,maxRecords=256,
 previouslyAcceptedOperationIds=[]
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !Array.isArray(records)||records.length<1||
  !Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>1024||
  records.length>maxRecords)
  throw new EngineContractError("INVALID_INPUT","Invalid durability checkpoint configuration");
 try{
  const startSequence=own(startingAnchor,"sequence");
  const startDigest=own(startingAnchor,"registryDigest");
  const endSequence=own(endingAnchor,"sequence");
  const endDigest=own(endingAnchor,"registryDigest");
  if(!seq(startSequence)||!seq(endSequence)||!hex(startDigest)||!hex(endDigest))
   return blocked("CHECKPOINT_UNVERIFIED");
  const start=verifyReviewReplayRollbackAnchor({
   anchor:startingAnchor,registryDigest:startDigest,
   minimumSequence:startSequence,key});
  if(start.state!=="rollback_anchor_verified")
   return blocked("START_CHECKPOINT_UNVERIFIED");
  const end=verifyReviewReplayRollbackAnchor({
   anchor:endingAnchor,registryDigest:endDigest,
   minimumSequence:endSequence,key});
  if(end.state!=="rollback_anchor_verified")
   return blocked("END_CHECKPOINT_UNVERIFIED");
  if(startSequence>Number.MAX_SAFE_INTEGER-records.length||
   endSequence!==startSequence+records.length)
   return blocked("CHECKPOINT_HISTORY_TRUNCATED_OR_EXTENDED");
  const history=inspectReviewDurabilityTransitionHistory({
   records,startingSequence:startSequence,startingDigest:startDigest,
   key,maxRecords,previouslyAcceptedOperationIds});
  if(history.state!=="durability_history_consistent_for_manual_review")
   return blocked(history.findings?.[0]??"HISTORY_UNVERIFIED");
  if(history.endingSequence!==endSequence||history.endingDigest!==endDigest)
   return blocked("CHECKPOINT_HISTORY_MISMATCH");
  return Object.freeze({state:"durability_checkpoint_consistent_for_manual_review",
   startingSequence:startSequence,endingSequence:endSequence,
   endingDigest:endDigest,recordCount:records.length,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("CHECKPOINT_UNVERIFIED");}
}
