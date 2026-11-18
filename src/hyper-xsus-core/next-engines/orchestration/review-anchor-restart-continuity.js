import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const blocked=code=>Object.freeze({state:"restart_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Invalid observation");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe observation");
 return d.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 68: compare authenticated anchor observations made before and after
 * a reported restart. Observations must be supplied by an independent trusted
 * provider; this function cannot prove a restart, fsync or storage durability.
 * Never authorizes writes, retries or recovery.
 */
export function inspectReviewAnchorRestartContinuity({
 before,after,key,minimumSequence=0
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !seq(minimumSequence))
  throw new EngineContractError("INVALID_INPUT","Invalid restart continuity configuration");
 try{
  const bAnchor=own(before,"anchor"),aAnchor=own(after,"anchor");
  const bDigest=own(before,"registryDigest"),aDigest=own(after,"registryDigest");
  const bEpoch=own(before,"epoch"),aEpoch=own(after,"epoch");
  if(!hex(bDigest)||!hex(aDigest)||typeof bEpoch!=="string"||
   typeof aEpoch!=="string"||!/^[a-zA-Z0-9._-]{1,128}$/.test(bEpoch)||
   !/^[a-zA-Z0-9._-]{1,128}$/.test(aEpoch)||bEpoch===aEpoch)
   return blocked("RESTART_EPOCH_UNVERIFIED");
  const b=verifyReviewReplayRollbackAnchor({
   anchor:bAnchor,registryDigest:bDigest,minimumSequence,key});
  if(b.state!=="rollback_anchor_verified")
   return blocked("BEFORE_ANCHOR_UNVERIFIED");
  const a=verifyReviewReplayRollbackAnchor({
   anchor:aAnchor,registryDigest:aDigest,minimumSequence:b.sequence,key});
  if(a.state!=="rollback_anchor_verified")
   return blocked(a.findings?.[0]??"AFTER_ANCHOR_UNVERIFIED");
  const bTag=own(bAnchor,"authenticationTag");
  const aTag=own(aAnchor,"authenticationTag");
  if(a.sequence!==b.sequence||aDigest!==bDigest||aTag!==bTag)
   return blocked("RESTART_STATE_DIVERGED");
  return Object.freeze({state:"restart_continuity_observed_for_manual_review",
   sequence:a.sequence,registryDigest:aDigest,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("RESTART_CONTINUITY_UNVERIFIED");}
}
