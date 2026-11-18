import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {createReviewStorageDurabilityReceipt} from "../../next-engines/orchestration/review-storage-durability-receipt.js";
import {inspectReviewDurabilityCheckpoint} from "../../next-engines/orchestration/review-durability-checkpoint.js";
const key=Buffer.alloc(32,81);
const hashes=["a".repeat(64),"b".repeat(64),"c".repeat(64)];
const anchor=(version,digest)=>createReviewReplayRollbackAnchor({version,digest,key});
const record=(operationId,sequence,previousRegistryDigest,registryDigest)=>{
 const storageEpoch="boot-3";
 return {operationId,sequence,previousRegistryDigest,registryDigest,storageEpoch,
  receipt:createReviewStorageDurabilityReceipt({
   operationId,sequence,registryDigest,storageEpoch,key})};
};
const records=()=>[record("op-1",6,hashes[0],hashes[1]),
 record("op-2",7,hashes[1],hashes[2])];
const inspect=(options={})=>inspectReviewDurabilityCheckpoint({
 records:records(),startingAnchor:anchor(5,hashes[0]),
 endingAnchor:anchor(7,hashes[2]),key,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 71 — trusted history checkpoints",()=>{
 it("binds a contiguous authenticated history to both checkpoints",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"durability_checkpoint_consistent_for_manual_review",
   startingSequence:5,endingSequence:7,recordCount:2});denied(result);
 });
 it("detects a truncated history against a trusted end checkpoint",()=>{
  const result=inspect({records:records().slice(0,1)});
  expect(result.findings).toContain("CHECKPOINT_HISTORY_TRUNCATED_OR_EXTENDED");denied(result);
 });
 it("detects an extra record beyond the trusted end checkpoint",()=>{
  const extra=record("op-3",8,hashes[2],"d".repeat(64));
  const result=inspect({records:[...records(),extra]});
  expect(result.findings).toContain("CHECKPOINT_HISTORY_TRUNCATED_OR_EXTENDED");denied(result);
 });
 it("blocks a different authenticated ending digest",()=>{
  const result=inspect({endingAnchor:anchor(7,"d".repeat(64))});
  expect(result.findings).toContain("CHECKPOINT_HISTORY_MISMATCH");denied(result);
 });
 it("blocks a forged starting checkpoint",()=>{
  const result=inspect({startingAnchor:{...anchor(5,hashes[0]),
   authenticationTag:"0".repeat(64)}});
  expect(result.findings).toContain("START_CHECKPOINT_UNVERIFIED");denied(result);
 });
 it("blocks a missing ending checkpoint",()=>{
  const result=inspect({endingAnchor:null});
  expect(result.state).toBe("durability_checkpoint_blocked");denied(result);
 });
 it("blocks a broken middle transition and replayed operation",()=>{
  const broken=records();broken[1]={...broken[1],previousRegistryDigest:hashes[0]};
  denied(inspect({records:broken}));
  const replay=inspect({previouslyAcceptedOperationIds:["op-1"]});
  expect(replay.findings).toContain("HISTORY_OPERATION_REPLAYED");denied(replay);
 });
 it("blocks hostile checkpoint accessors and invalid bounds",()=>{
  const hostile={...anchor(7,hashes[2])};
  Object.defineProperty(hostile,"sequence",{get(){throw Error("unsafe");}});
  denied(inspect({endingAnchor:hostile}));
  expect(()=>inspect({maxRecords:1})).toThrow();
 });
});
