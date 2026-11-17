import {EngineContractError,object,string} from "../contracts.js";
import {replayDecisionJournal} from "./decision-journal.js";
export function createRecoveryCheckpoint(journal) {
  const replay=replayDecisionJournal(journal);
  return {schemaVersion:1,requestId:journal.requestId,traceId:journal.traceId,completed:replay.completed,rejected:replay.rejected,nextAction:"manual_review",resumeExecution:false,persisted:false};
}
export function inspectRecoveryCheckpoint(checkpoint,journal) {
  object(checkpoint,"checkpoint");
  const replay=replayDecisionJournal(journal);
  if(checkpoint.schemaVersion!==1||string(checkpoint.requestId,"requestId")!==journal.requestId||string(checkpoint.traceId,"traceId")!==journal.traceId||checkpoint.completed!==replay.completed||checkpoint.rejected!==replay.rejected||checkpoint.resumeExecution!==false||checkpoint.persisted!==false||checkpoint.nextAction!=="manual_review")throw new EngineContractError("CHECKPOINT_MISMATCH","Recovery checkpoint mismatch");
  return {consistent:true,manualReviewRequired:true,resumed:false,sideEffects:false};
}
