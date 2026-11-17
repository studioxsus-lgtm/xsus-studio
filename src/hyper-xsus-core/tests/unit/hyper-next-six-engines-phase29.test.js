import {describe,it,expect} from "vitest";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createDecisionJournal} from "../../next-engines/orchestration/decision-journal.js";
import {createRecoveryCheckpoint} from "../../next-engines/orchestration/recovery-checkpoint.js";
import {createReviewControlPlane} from "../../next-engines/orchestration/review-control-plane.js";
import {assessReviewReadiness} from "../../next-engines/orchestration/review-readiness.js";
const req=()=>({contractVersion:"1.0.0",requestId:"phase29",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace29",authorizationRef:"policy:test"}});
function evidence(){
 const journal=createDecisionJournal(coordinateSixEngines(req()));
 return {requestId:"phase29",traceId:"trace29",
  controlSnapshot:createReviewControlPlane().snapshot(),
  recoveredSnapshot:{journal,checkpoint:createRecoveryCheckpoint(journal),recovered:true,executionAuthorized:false}};
}
describe("Hyper six engines phase 29 — evidence-based review readiness",()=>{
 it("produces an immutable manual-review report without claiming production readiness",()=>{
  const report=assessReviewReadiness(evidence());
  expect(report).toMatchObject({status:"manual_review_required",journalVerified:true,completed:0,
   productionReady:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.blockers)).toBe(true);
 });
 it("blocks assessment when work is still in flight",()=>{
  const input=evidence();
  input.controlSnapshot={...input.controlSnapshot,health:{...input.controlSnapshot.health,
   status:"busy",inFlight:1,atCapacity:false}};
  expect(assessReviewReadiness(input)).toMatchObject({status:"review_blocked",blockers:["IN_FLIGHT_WORK"]});
 });
 it("blocks assessment for an open circuit and observed timeouts",()=>{
  const input=evidence();
  input.controlSnapshot={...input.controlSnapshot,
   health:{...input.controlSnapshot.health,timedOut:1},
   circuit:{...input.controlSnapshot.circuit,state:"open"}};
  expect(assessReviewReadiness(input).blockers).toEqual(["CIRCUIT_NOT_CLOSED","TIMEOUTS_OBSERVED"]);
 });
 it("rejects forged execution permissions in control snapshots",()=>{
  const input=evidence();
  input.controlSnapshot={...input.controlSnapshot,executionAuthorized:true};
  expect(()=>assessReviewReadiness(input)).toThrowError(expect.objectContaining({code:"UNSAFE_REVIEW"}));
 });
 it("rejects a corrupted or mismatched recovery checkpoint",()=>{
  const input=evidence();
  input.recoveredSnapshot.checkpoint={...input.recoveredSnapshot.checkpoint,completed:999};
  expect(()=>assessReviewReadiness(input)).toThrowError(expect.objectContaining({code:"CHECKPOINT_MISMATCH"}));
 });
 it("rejects cross-request identity substitutions",()=>{
  const input=evidence();input.traceId="different";
  expect(()=>assessReviewReadiness(input)).toThrowError(expect.objectContaining({code:"JOURNAL_CONFLICT"}));
 });
 it("rejects impossible resource snapshots",()=>{
  const input=evidence();
  input.controlSnapshot={...input.controlSnapshot,
   health:{...input.controlSnapshot.health,inFlight:999}};
  expect(()=>assessReviewReadiness(input)).toThrowError(expect.objectContaining({code:"INVALID_INPUT"}));
 });
 it("exposes no principal, authorization token or stage payloads",()=>{
  const serialized=JSON.stringify(assessReviewReadiness(evidence()));
  expect(serialized).not.toContain("policy:test");
  expect(serialized).not.toContain("tester");
  expect(serialized).not.toContain("payload");
 });
});
