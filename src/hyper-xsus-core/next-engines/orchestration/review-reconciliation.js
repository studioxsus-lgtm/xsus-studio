import {EngineContractError,object,string} from "../contracts.js";
import {replayDecisionJournal} from "./decision-journal.js";
import {inspectRecoveryCheckpoint} from "./recovery-checkpoint.js";

/**
 * Read-only reconciliation after a caller timeout or cancellation.
 * An absent record is NOT proof that a pending write has finished.
 * This function never retries, saves, dispatches, or authorizes execution.
 */
export async function reconcileReviewRecord({requestId,traceId},store) {
  string(requestId,"requestId");
  string(traceId,"traceId");
  object(store,"store");
  if(typeof store.load!=="function")
    throw new EngineContractError("INVALID_INPUT","Store must expose load");
  const snapshot=await store.load();
  if(snapshot===null){
    return Object.freeze({state:"not_observed",requestId,recorded:false,
      retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
  }
  object(snapshot,"snapshot");
  if(snapshot.recovered!==true||snapshot.executionAuthorized!==false)
    throw new EngineContractError("PERSISTENCE_UNVERIFIED","Recovery acknowledgment is invalid");
  const journal=object(snapshot.journal,"journal");
  const checkpoint=object(snapshot.checkpoint,"checkpoint");
  // Verify integrity/semantics before considering the record authoritative.
  const replay=replayDecisionJournal(journal);
  inspectRecoveryCheckpoint(checkpoint,journal);
  if(journal.requestId!==requestId||journal.traceId!==traceId)
    throw new EngineContractError("JOURNAL_CONFLICT","Recovered record belongs to another request or trace");
  return Object.freeze({state:"recorded_for_manual_review",requestId,
    recorded:true,retrySafe:false,completed:replay.completed,rejected:replay.rejected,
    executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
}
