import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {inspectReviewCheckpointAdmission} from "../../next-engines/orchestration/review-checkpoint-admission.js";
const key=Buffer.alloc(32,101),digest="a".repeat(64);
const checkpoint=()=>createReviewReplayRollbackAnchor({version:8,digest,key});
const inspect=(options={})=>inspectReviewCheckpointAdmission({
 checkpoint:checkpoint(),checkpointId:"cp-8",minimumSequence:7,
 expectedDigest:digest,key,previousLedgerRevision:4,
 previouslyAcceptedCheckpointIds:["cp-7"],
 providerOutcome:{status:"applied",expectedRevision:4,checkpointId:"cp-8"},
 observedLedger:{revision:5,minimumSequence:8,registryDigest:digest,
  acceptedCheckpointIds:["cp-7","cp-8"]},...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 73 — checkpoint CAS admission observation",()=>{
 it("observes matching external CAS and ledger state for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"checkpoint_admission_observed_for_manual_review",
   checkpointId:"cp-8",sequence:8,ledgerRevision:5});denied(result);
 });
 it("blocks a concurrent CAS conflict",()=>{
  const result=inspect({providerOutcome:{status:"conflict"}});
  expect(result.findings).toContain("ADMISSION_CAS_CONFLICT");denied(result);
 });
 it("blocks an interrupted CAS without retrying",()=>{
  const result=inspect({providerOutcome:{status:"interrupted"}});
  expect(result.findings).toContain("ADMISSION_CAS_INTERRUPTED");denied(result);
 });
 it("blocks stale CAS preconditions",()=>{
  const result=inspect({providerOutcome:{status:"applied",
   expectedRevision:3,checkpointId:"cp-8"}});
  expect(result.findings).toContain("ADMISSION_CAS_PRECONDITION_MISMATCH");denied(result);
 });
 it("blocks a ledger revision that did not advance exactly once",()=>{
  const result=inspect({observedLedger:{revision:4,minimumSequence:8,
   registryDigest:digest,acceptedCheckpointIds:["cp-7","cp-8"]}});
  expect(result.findings).toContain("ADMISSION_LEDGER_MISMATCH");denied(result);
 });
 it("blocks duplicate checkpoint IDs in the observed ledger",()=>{
  const result=inspect({observedLedger:{revision:5,minimumSequence:8,
   registryDigest:digest,acceptedCheckpointIds:["cp-8","cp-8"]}});
  expect(result.findings).toContain("ADMISSION_LEDGER_UNVERIFIED");denied(result);
 });
 it("blocks missing prior accepted IDs or missing newly accepted ID",()=>{
  denied(inspect({observedLedger:{revision:5,minimumSequence:8,
   registryDigest:digest,acceptedCheckpointIds:["cp-8","cp-9"]}}));
  denied(inspect({observedLedger:{revision:5,minimumSequence:8,
   registryDigest:digest,acceptedCheckpointIds:["cp-7"]}}));
 });
 it("blocks replayed checkpoint identities and forged anchors",()=>{
  denied(inspect({previouslyAcceptedCheckpointIds:["cp-8"]}));
  denied(inspect({checkpoint:{...checkpoint(),authenticationTag:"0".repeat(64)}}));
 });
 it("blocks hostile provider getters and invalid configuration",()=>{
  const hostile={};
  Object.defineProperty(hostile,"status",{get(){throw Error("unsafe");}});
  denied(inspect({providerOutcome:hostile}));
  expect(()=>inspect({previousLedgerRevision:Number.MAX_SAFE_INTEGER})).toThrow();
 });
});
