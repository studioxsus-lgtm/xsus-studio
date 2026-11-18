import {EngineContractError,object,string} from "../contracts.js";
import {inspectReviewLock} from "./review-lock-recovery.js";
import {reconcileReviewRecord} from "./review-reconciliation.js";

/**
 * Read-only recovery assessment. Lock and journal are separate observations,
 * not an atomic snapshot. Re-check the lock after journal reconciliation to
 * detect observable changes; matching checks do NOT prove atomic consistency.
 * Never grants retries, lock removal or execution.
 */
export async function assessReviewRecovery({filePath,requestId,traceId,store}={}){
 string(filePath,"filePath");
 string(requestId,"requestId");
 string(traceId,"traceId");
 object(store,"store");
 if(typeof store.load!=="function")
  throw new EngineContractError("INVALID_INPUT","Store must expose load");
 const lock=await inspectReviewLock({filePath});
 const sameLock=(a,b)=>a.state===b.state&&
  a.lockPresent===b.lockPresent&&a.ownerPid===b.ownerPid&&
  a.ownerFingerprint===b.ownerFingerprint;
 let journal;
 try{
  journal=await reconcileReviewRecord({requestId,traceId},store);
 }catch(error){
  // A held lock, corrupted journal or inconsistent recovery record is never
  // evidence that a retry is safe. Preserve only the code, not private details.
  let lockAfter;
  try{lockAfter=await inspectReviewLock({filePath});}
  catch{lockAfter=null;}
  const stable=lockAfter!==null&&sameLock(lock,lockAfter);
  return Object.freeze({
   state:"review_blocked",lockState:stable?lock.state:"changed_during_assessment",journalState:"unverified",
   errorCode:typeof error?.code==="string"?error.code:"RECOVERY_UNVERIFIED",
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"
  });
 }
 const lockAfter=await inspectReviewLock({filePath});
 // Any observed lock transition blocks even a successfully replayed journal.
 // This is a conservative check, not a transaction or linearizable snapshot.
 const stable=sameLock(lock,lockAfter);
 const recorded=journal.state==="recorded_for_manual_review";
 const clear=stable&&lock.state==="not_observed";
 return Object.freeze({
  state:recorded&&clear?"recorded_for_manual_review":"review_blocked",
  lockState:stable?lock.state:"changed_during_assessment",journalState:journal.state,
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,
  nextAction:recorded&&clear?"manual_review":"manual_investigation"
 });
}
