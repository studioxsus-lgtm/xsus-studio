import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const blocked=code=>Object.freeze({state:"admission_restart_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe ledger");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe ledger field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const parse=(record,maxIds)=>{
 const revision=own(record,"revision"),minimumSequence=own(record,"minimumSequence");
 const registryDigest=own(record,"registryDigest"),ids=own(record,"acceptedCheckpointIds");
 if(!seq(revision)||!seq(minimumSequence)||!hex(registryDigest)||
  !Array.isArray(ids)||ids.length>maxIds)throw Error("Invalid ledger");
 const seen=new Set();
 for(let i=0;i<ids.length;i++){
  const d=Object.getOwnPropertyDescriptor(ids,String(i));
  if(!d||!("value" in d)||!id(d.value)||seen.has(d.value))
   throw Error("Invalid ledger IDs");
  seen.add(d.value);
 }
 return {revision,minimumSequence,registryDigest,seen};
};
/**
 * Phase 74: read-only continuity inspection after a claimed restart.
 * The caller must obtain independent, fresh ledger observations from a
 * trusted persistent provider and authenticate the checkpoint separately.
 * Epoch labels are caller assertions, not evidence of actual restart/fsync.
 * No recovery, retries, writes, or automatic acceptance.
 */
export function inspectReviewAdmissionRestartContinuity({
 before,after,beforeEpoch,afterEpoch,checkpoint,key,maxAcceptedIds=10000
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !Number.isSafeInteger(maxAcceptedIds)||maxAcceptedIds<1||maxAcceptedIds>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid admission restart configuration");
 try{
  if(!id(beforeEpoch)||!id(afterEpoch)||beforeEpoch===afterEpoch)
   return blocked("RESTART_EPOCH_UNVERIFIED");
  const b=parse(before,maxAcceptedIds),a=parse(after,maxAcceptedIds);
  const verified=verifyReviewReplayRollbackAnchor({
   anchor:checkpoint,registryDigest:b.registryDigest,
   minimumSequence:b.minimumSequence,key});
  if(verified.state!=="rollback_anchor_verified"||
   verified.sequence!==b.minimumSequence)
   return blocked("BEFORE_CHECKPOINT_UNVERIFIED");
  if(a.revision<b.revision||a.minimumSequence<b.minimumSequence)
   return blocked("ADMISSION_LEDGER_ROLLBACK");
  if(a.revision!==b.revision||a.minimumSequence!==b.minimumSequence||
   a.registryDigest!==b.registryDigest)
   return blocked("ADMISSION_RESTART_STATE_CHANGED");
  if(a.seen.size!==b.seen.size)
   return blocked("ADMISSION_ACCEPTANCE_LOST_OR_ADDED");
  for(const accepted of b.seen)
   if(!a.seen.has(accepted))return blocked("ADMISSION_ACCEPTANCE_LOST_OR_ADDED");
  return Object.freeze({state:"admission_restart_continuity_observed_for_manual_review",
   ledgerRevision:a.revision,sequence:a.minimumSequence,
   acceptedCount:a.seen.size,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ADMISSION_RESTART_UNVERIFIED");}
}
