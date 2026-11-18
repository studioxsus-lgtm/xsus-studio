import {EngineContractError} from "../contracts.js";
import {inspectReviewAdmissionLedgerIntegrity} from "./review-admission-ledger-integrity.js";

const blocked=code=>Object.freeze({state:"admission_ledger_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe snapshot");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const parse=(snapshot,ledgerId,key,maxAcceptedIds)=>{
 const ledger=own(snapshot,"ledger"),receipt=own(snapshot,"receipt");
 const result=inspectReviewAdmissionLedgerIntegrity({
  ledger,ledgerId,receipt,key,maxAcceptedIds});
 if(result.state!=="admission_ledger_integrity_observed_for_manual_review")
  throw Error("Unauthenticated snapshot");
 const ids=own(ledger,"acceptedCheckpointIds");
 const accepted=new Set();
 for(let i=0;i<ids.length;i++){
  const d=Object.getOwnPropertyDescriptor(ids,String(i));
  if(!d||!("value" in d)||!id(d.value))throw Error("Invalid ID");
  accepted.add(d.value);
 }
 return {revision:result.revision,minimumSequence:result.minimumSequence,
  digest:own(ledger,"registryDigest"),accepted,
  tag:own(receipt,"authenticationTag")};
};
/**
 * Phase 76: read-only continuity of authenticated ledger snapshots.
 * Detects forks at the same revision, missing revisions, dropped accepted
 * identities, and invalid MACs. Requires a trusted complete ordered history
 * and independent monotonic floor; cannot establish global fork absence.
 */
export function inspectReviewAdmissionLedgerContinuity({
 snapshots,ledgerId,key,minimumRevision=0,maxSnapshots=256,
 maxAcceptedIds=10000
}={}){
 if(!Array.isArray(snapshots)||snapshots.length<2||
  !seq(maxSnapshots)||maxSnapshots<2||maxSnapshots>1024||
  snapshots.length>maxSnapshots||!seq(minimumRevision)||
  !id(ledgerId)||!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !seq(maxAcceptedIds)||maxAcceptedIds<1||maxAcceptedIds>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid ledger continuity configuration");
 try{
  let previous;
  for(let i=0;i<snapshots.length;i++){
   const d=Object.getOwnPropertyDescriptor(snapshots,String(i));
   if(!d||!("value" in d))return blocked("LEDGER_SNAPSHOT_UNVERIFIED");
   const current=parse(d.value,ledgerId,key,maxAcceptedIds);
   if(!seq(current.revision)||!seq(current.minimumSequence)||!hex(current.digest)||
    !hex(current.tag))return blocked("LEDGER_SNAPSHOT_UNVERIFIED");
   if(i===0&&current.revision<minimumRevision)
    return blocked("LEDGER_ROLLBACK_DETECTED");
   if(previous){
    if(current.revision===previous.revision)
     return blocked(current.tag===previous.tag?
      "LEDGER_SNAPSHOT_REPLAYED":"LEDGER_FORK_DETECTED");
    if(previous.revision===Number.MAX_SAFE_INTEGER||
     current.revision!==previous.revision+1)
     return blocked("LEDGER_REVISION_DISCONTINUITY");
    if(current.minimumSequence<previous.minimumSequence)
     return blocked("LEDGER_SEQUENCE_ROLLBACK");
    for(const accepted of previous.accepted)
     if(!current.accepted.has(accepted))
      return blocked("LEDGER_ACCEPTANCE_REMOVED");
    if(current.accepted.size!==previous.accepted.size+1)
     return blocked("LEDGER_ACCEPTANCE_DELTA_UNVERIFIED");
    if(current.minimumSequence===previous.minimumSequence)
     return blocked("LEDGER_SEQUENCE_NOT_ADVANCED");
   }
   previous=current;
  }
  return Object.freeze({state:"admission_ledger_continuity_observed_for_manual_review",
   ledgerId,endingRevision:previous.revision,
   endingSequence:previous.minimumSequence,snapshotCount:snapshots.length,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("LEDGER_SNAPSHOT_UNVERIFIED");}
}
