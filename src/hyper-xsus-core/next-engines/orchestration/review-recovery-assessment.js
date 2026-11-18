import {EngineContractError,object,string} from "../contracts.js";
import {inspectReviewLock} from "./review-lock-recovery.js";
import {reconcileReviewRecord} from "./review-reconciliation.js";

/**
 * Read-only recovery assessment. Lock and journal are separate observations,
 * not an atomic snapshot. Re-check the lock after journal reconciliation to\n * detect observable changes; matching checks do NOT prove atomic consistency.\n * Never grants retries, lock removal or execution.
 */
export async function assessReviewRecovery({filePath,requestId,traceId,store}={}){
 string(filePath,"filePath");
 string(requestId,"requestId");
 string(traceId,"traceId");
 object(store,"store");
 if(typeof store.load!=="function")
  throw new EngineContractError("INVALID_INPUT","Store must expose load");
 const lock=await inspectReviewLock({filePath});
 let journal;
 try{
  journal=await reconcileReviewRecord({requestId,traceId},store);
 }catch(error){
  // A held lock, corrupted journal or inconsistent recovery record is never
  // evidence that a retry is safe. Preserve only the code, not private details.
  return Object.freeze({
   state:"review_blocked",lockState:lock.state,journalState:"unverified",
   errorCode:typeof error?.code==="string"?error.code:"RECOVERY_UNVERIFIED",
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"
  });
 }
 const lockAfter=await inspectReviewLock({filePath});
 // Any observed lock transition blocks even a successfully replayed journal.
 // This is a conservative check, not a transaction or linearizable snapshot.
 const stable=lock.state===lockAfter.state&&
  lock.lockPresent===lockAfter.lockPresent&&
  lock.ownerPid===lockAfter.ownerPid;
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
