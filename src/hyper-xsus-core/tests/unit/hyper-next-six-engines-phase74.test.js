import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {inspectReviewAdmissionRestartContinuity} from "../../next-engines/orchestration/review-admission-restart-continuity.js";
const key=Buffer.alloc(32,111),digest="a".repeat(64);
const checkpoint=()=>createReviewReplayRollbackAnchor({version:8,digest,key});
const ledger=()=>({revision:5,minimumSequence:8,registryDigest:digest,
 acceptedCheckpointIds:["cp-7","cp-8"]});
const inspect=(options={})=>inspectReviewAdmissionRestartContinuity({
 before:ledger(),after:ledger(),beforeEpoch:"boot-1",afterEpoch:"boot-2",
 checkpoint:checkpoint(),key,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 74 — checkpoint admission restart continuity",()=>{
 it("observes identical authenticated ledger state across distinct epochs",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"admission_restart_continuity_observed_for_manual_review",
   ledgerRevision:5,sequence:8,acceptedCount:2});denied(result);
 });
 it("blocks a lost confirmed checkpoint identity",()=>{
  const result=inspect({after:{...ledger(),acceptedCheckpointIds:["cp-7"]}});
  expect(result.findings).toContain("ADMISSION_ACCEPTANCE_LOST_OR_ADDED");denied(result);
 });
 it("blocks replacement of a confirmed checkpoint identity",()=>{
  const result=inspect({after:{...ledger(),acceptedCheckpointIds:["cp-7","cp-9"]}});
  expect(result.findings).toContain("ADMISSION_ACCEPTANCE_LOST_OR_ADDED");denied(result);
 });
 it("blocks a rollback of the persisted ledger revision",()=>{
  const result=inspect({after:{...ledger(),revision:4}});
  expect(result.findings).toContain("ADMISSION_LEDGER_ROLLBACK");denied(result);
 });
 it("blocks changed sequence or digest after restart",()=>{
  denied(inspect({after:{...ledger(),minimumSequence:9}}));
  denied(inspect({after:{...ledger(),registryDigest:"b".repeat(64)}}));
 });
 it("blocks identical epoch labels and forged checkpoints",()=>{
  denied(inspect({afterEpoch:"boot-1"}));
  denied(inspect({checkpoint:{...checkpoint(),authenticationTag:"0".repeat(64)}}));
 });
 it("blocks duplicate IDs and sparse ledgers",()=>{
  denied(inspect({after:{...ledger(),acceptedCheckpointIds:["cp-8","cp-8"]}}));
  denied(inspect({after:{...ledger(),acceptedCheckpointIds:new Array(2)}}));
 });
 it("blocks hostile accessors and invalid configuration",()=>{
  const hostile={...ledger()};
  Object.defineProperty(hostile,"revision",{get(){throw Error("unsafe");}});
  denied(inspect({after:hostile}));
  expect(()=>inspect({maxAcceptedIds:0})).toThrow();
 });
});
