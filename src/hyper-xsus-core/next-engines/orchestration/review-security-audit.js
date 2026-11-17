import {EngineContractError,object,string} from "../contracts.js";
import {replayDecisionJournal} from "./decision-journal.js";
import {inspectRecoveryCheckpoint} from "./recovery-checkpoint.js";

/**
 * Fail-closed contract audit for a recovered review record.
 * Returns only non-sensitive counters and identifiers, never stage payloads.
 * Does not establish provenance or authorization of the caller.
 */
export function auditReviewRecord({requestId,traceId},snapshot){
  string(requestId,"requestId");
  string(traceId,"traceId");
  object(snapshot,"snapshot");
  if(snapshot.recovered!==true||snapshot.executionAuthorized!==false)
    throw new EngineContractError("PERSISTENCE_UNVERIFIED","Unverified review snapshot");
  const journal=object(snapshot.journal,"journal");
  const checkpoint=object(snapshot.checkpoint,"checkpoint");
  const replay=replayDecisionJournal(journal);
  inspectRecoveryCheckpoint(checkpoint,journal);
  if(journal.requestId!==requestId||journal.traceId!==traceId)
    throw new EngineContractError("JOURNAL_CONFLICT","Review identity mismatch");
  if(journal.sideEffects!==false||journal.executionAuthorized!==false||
     replay.executionAuthorized!==false||replay.sideEffects!==false)
    throw new EngineContractError("UNSAFE_REVIEW","Execution authorization is forbidden");
  return Object.freeze({
    schemaVersion:1,valid:true,requestId,traceId,
    completed:replay.completed,rejected:replay.rejected,
    executionAuthorized:false,sideEffects:false,nextAction:"manual_review"
  });
}
