import {EngineContractError,object,string} from "../contracts.js";
import {inspectReviewLock} from "./review-lock-recovery.js";
import {observeReviewJournal} from "./review-journal-observation.js";
import {reconcileReviewRecord} from "./review-reconciliation.js";

/**
 * Read-only recovery assessment. Lock and journal are separate observations,
 * not an atomic snapshot. Re-check the lock after journal reconciliation to
 * detect observable changes; matching checks do NOT prove atomic consistency.
 * Never grants retries, lock removal or execution.
 */
export async function assessReviewRecovery({filePath,requestId,traceId,store,signal}={}){
 string(filePath,"filePath");
 string(requestId,"requestId");
 string(traceId,"traceId");
 object(store,"store");
 if(typeof store.load!=="function")
  throw new EngineContractError("INVALID_INPUT","Store must expose load");
 if(signal!==undefined&&(typeof signal?.aborted!=="boolean"||
    typeof signal?.addEventListener!=="function"))
  throw new EngineContractError("INVALID_INPUT","signal must be an AbortSignal");
 const interrupted=()=>Object.freeze({state:"review_blocked",
  lockState:"unverified",journalState:"unverified",
  errorCode:"ASSESSMENT_INTERRUPTED",recoveryAuthorized:false,
  deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
  sideEffects:false,nextAction:"manual_investigation"});
 // Cancellation affects the assessment result, never an in-flight store operation.
 if(signal?.aborted)return interrupted();
 const lock=await inspectReviewLock({filePath});
 const journalBefore=await observeReviewJournal({filePath});
 if(signal?.aborted)return interrupted();
 const sameJournal=(a,b)=>a.state===b.state&&a.fingerprint===b.fingerprint;
 const sameLock=(a,b)=>a.state===b.state&&
  a.lockPresent===b.lockPresent&&a.ownerPid===b.ownerPid&&
  a.ownerFingerprint===b.ownerFingerprint;
 let journal;
 try{
  journal=await reconcileReviewRecord({requestId,traceId},store);
 }catch(error){
  if(signal?.aborted)return interrupted();
  // A held lock, corrupted journal or inconsistent recovery record is never
  // evidence that a retry is safe. Preserve only the code, not private details.
  let lockAfter,journalAfter;
  try{lockAfter=await inspectReviewLock({filePath});}
  catch{lockAfter=null;}
  try{journalAfter=await observeReviewJournal({filePath});}
  catch{journalAfter=null;}
  const stable=lockAfter!==null&&sameLock(lock,lockAfter);
  const journalStable=journalAfter!==null&&sameJournal(journalBefore,journalAfter);
  return Object.freeze({
   state:"review_blocked",lockState:stable?lock.state:"changed_during_assessment",
   journalState:journalStable?"unverified":"changed_during_assessment",
   errorCode:typeof error?.code==="string"?error.code:"RECOVERY_UNVERIFIED",
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"
  });
 }
 if(signal?.aborted)return interrupted();
 const lockAfter=await inspectReviewLock({filePath});
 const journalAfter=await observeReviewJournal({filePath});
 if(signal?.aborted)return interrupted();
 // Any observed lock transition blocks even a successfully replayed journal.
 // This is a conservative check, not a transaction or linearizable snapshot.
 const stable=sameLock(lock,lockAfter);
 const journalStable=sameJournal(journalBefore,journalAfter);
 const recorded=journal.state==="recorded_for_manual_review";
 const clear=stable&&lock.state==="not_observed"&&journalStable&&
  journalBefore.state==="observed";
 return Object.freeze({
  state:recorded&&clear?"recorded_for_manual_review":"review_blocked",
  lockState:stable?lock.state:"changed_during_assessment",
  journalState:journalStable?journal.state:"changed_during_assessment",
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,
  nextAction:recorded&&clear?"manual_review":"manual_investigation"
 });
}
