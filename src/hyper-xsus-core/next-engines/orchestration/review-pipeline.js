import {EngineContractError,object} from "../contracts.js";
import {coordinateSixEngines} from "./index.js";
import {createDecisionJournal,replayDecisionJournal} from "./decision-journal.js";
import {createRecoveryCheckpoint,inspectRecoveryCheckpoint} from "./recovery-checkpoint.js";

/**
 * Review-only end-to-end pipeline. No authorization, dispatch or execution.
 * A successful persistence acknowledgment is required before reporting "recorded".
 */
export async function coordinateAndRecord(input, store) {
  object(store,"store");
  if(typeof store.save!=="function"||typeof store.load!=="function")
    throw new EngineContractError("INVALID_INPUT","Store must expose save and load");
  const response=coordinateSixEngines(input);
  const journal=createDecisionJournal(response);
  const checkpoint=createRecoveryCheckpoint(journal);
  const saved=await store.save(response);
  if(!saved||saved.saved!==true||saved.requestId!==journal.requestId||saved.executionAuthorized!==false)
    throw new EngineContractError("PERSISTENCE_UNVERIFIED","Persistence acknowledgment is invalid");
  const loaded=await store.load();
  if(!loaded||loaded.recovered!==true||loaded.executionAuthorized!==false)
    throw new EngineContractError("PERSISTENCE_UNVERIFIED","Stored journal was not recovered");
  // Compare with the expected record first: a forged trace must not be
  // misclassified as a checkpoint-only mismatch.
  if(JSON.stringify(loaded.journal)!==JSON.stringify(journal)||
     JSON.stringify(loaded.checkpoint)!==JSON.stringify(checkpoint))
    throw new EngineContractError("PERSISTENCE_MISMATCH","Recovered journal differs from request");
  const replay=replayDecisionJournal(loaded.journal);
  inspectRecoveryCheckpoint(loaded.checkpoint,loaded.journal);
  return Object.freeze({
    requestId:journal.requestId,
    traceId:journal.traceId,
    state:"recorded_for_manual_review",
    completed:replay.completed,
    rejected:replay.rejected,
    recorded:true,
    executionAuthorized:false,
    sideEffects:false,
    nextAction:"manual_review"
  });
}
