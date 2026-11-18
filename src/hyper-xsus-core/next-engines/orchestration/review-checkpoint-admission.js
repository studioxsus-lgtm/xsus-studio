import {EngineContractError} from "../contracts.js";
import {inspectReviewCheckpointFreshness} from "./review-checkpoint-freshness.js";

const blocked=code=>Object.freeze({state:"checkpoint_admission_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(object,name)=>{
 if(!object||typeof object!=="object"||Array.isArray(object))
  throw Error("Unsafe admission record");
 const d=Object.getOwnPropertyDescriptor(object,name);
 if(!d||!("value" in d))throw Error("Unsafe admission field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
/**
 * Phase 73: read-only inspection of an external atomic admission result.
 * The provider MUST atomically compare its ledger revision, insert the
 * checkpoint identity exactly once, and advance the monotonic floor.
 * Its reported result and observed state are assertions, not proof of
 * atomicity, persistence or absence of races. No writes or retries here.
 */
export function inspectReviewCheckpointAdmission({
 checkpoint,checkpointId,minimumSequence,expectedDigest,key,
 previousLedgerRevision,previouslyAcceptedCheckpointIds=[],
 providerOutcome,observedLedger
}={}){
 if(!id(checkpointId)||!seq(minimumSequence)||!hex(expectedDigest)||
  !seq(previousLedgerRevision)||previousLedgerRevision===Number.MAX_SAFE_INTEGER||
  !Buffer.isBuffer(key)||key.length<32||key.length>4096)
  throw new EngineContractError("INVALID_INPUT","Invalid checkpoint admission configuration");
 try{
  const fresh=inspectReviewCheckpointFreshness({
   checkpoint,checkpointId,minimumSequence,expectedDigest,key,
   previouslyAcceptedCheckpointIds});
  if(fresh.state!=="checkpoint_freshness_observed_for_manual_review")
   return blocked(fresh.findings?.[0]??"CHECKPOINT_FRESHNESS_UNVERIFIED");
  const status=own(providerOutcome,"status");
  if(status==="conflict")return blocked("ADMISSION_CAS_CONFLICT");
  if(status==="interrupted")return blocked("ADMISSION_CAS_INTERRUPTED");
  if(status!=="applied")return blocked("ADMISSION_OUTCOME_UNVERIFIED");
  if(own(providerOutcome,"expectedRevision")!==previousLedgerRevision||
   own(providerOutcome,"checkpointId")!==checkpointId)
   return blocked("ADMISSION_CAS_PRECONDITION_MISMATCH");
  const revision=own(observedLedger,"revision");
  const floor=own(observedLedger,"minimumSequence");
  const digest=own(observedLedger,"registryDigest");
  const acceptedIds=own(observedLedger,"acceptedCheckpointIds");
  if(revision!==previousLedgerRevision+1||!seq(floor)||
   floor!==fresh.sequence||digest!==expectedDigest||
   !Array.isArray(acceptedIds)||acceptedIds.length>10000)
   return blocked("ADMISSION_LEDGER_MISMATCH");
  const seen=new Set();
  for(let i=0;i<acceptedIds.length;i++){
   const d=Object.getOwnPropertyDescriptor(acceptedIds,String(i));
   if(!d||!("value" in d)||!id(d.value)||seen.has(d.value))
    return blocked("ADMISSION_LEDGER_UNVERIFIED");
   seen.add(d.value);
  }
  if(!seen.has(checkpointId)||seen.size!==previouslyAcceptedCheckpointIds.length+1)
   return blocked("ADMISSION_LEDGER_MISMATCH");
  for(let i=0;i<previouslyAcceptedCheckpointIds.length;i++){
   const d=Object.getOwnPropertyDescriptor(previouslyAcceptedCheckpointIds,String(i));
   if(!d||!("value" in d)||!seen.has(d.value))
    return blocked("ADMISSION_LEDGER_MISMATCH");
  }
  return Object.freeze({state:"checkpoint_admission_observed_for_manual_review",
   checkpointId,sequence:fresh.sequence,ledgerRevision:revision,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ADMISSION_OUTCOME_UNVERIFIED");}
}
