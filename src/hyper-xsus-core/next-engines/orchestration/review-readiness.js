import {EngineContractError,object,string} from "../contracts.js";
import {auditReviewRecord} from "./review-security-audit.js";

/**
 * Local evidence-only readiness assessment. A passing report means only that
 * the supplied in-memory control snapshot and recovered journal agree with
 * the review-only contracts; it does NOT certify production readiness.
 */
export function assessReviewReadiness({requestId,traceId,controlSnapshot,recoveredSnapshot}){
 string(requestId,"requestId");string(traceId,"traceId");
 const control=object(controlSnapshot,"controlSnapshot");
 const health=object(control.health,"health");
 const circuit=object(control.circuit,"circuit");
 if(control.executionAuthorized!==false||control.sideEffects!==false||
    health.executionAuthorized!==false||health.sideEffects!==false||
    circuit.executionAuthorized!==false)
   throw new EngineContractError("UNSAFE_REVIEW","Review control plane must not authorize execution");
 if(!["idle","busy","saturated"].includes(health.status)||
    !Number.isSafeInteger(health.inFlight)||health.inFlight<0||
    !Number.isSafeInteger(health.maxInFlight)||health.maxInFlight<1||
    health.inFlight>health.maxInFlight||
    health.atCapacity!==(health.inFlight===health.maxInFlight)||
    !["closed","open","half_open"].includes(circuit.state))
   throw new EngineContractError("INVALID_INPUT","Invalid control plane snapshot");
 const record=auditReviewRecord({requestId,traceId},recoveredSnapshot);
 const blockers=[];
 if(health.inFlight!==0)blockers.push("IN_FLIGHT_WORK");
 if(circuit.state!=="closed")blockers.push("CIRCUIT_NOT_CLOSED");
 if(health.timedOut>0)blockers.push("TIMEOUTS_OBSERVED");
 if(health.cancelled>0)blockers.push("CANCELLATIONS_OBSERVED");
 return Object.freeze({
  schemaVersion:1,requestId,traceId,
  status:blockers.length?"review_blocked":"manual_review_required",
  blockers:Object.freeze(blockers),
  journalVerified:record.valid,
  completed:record.completed,rejected:record.rejected,
  productionReady:false,executionAuthorized:false,sideEffects:false,
  nextAction:"manual_review"
 });
}
