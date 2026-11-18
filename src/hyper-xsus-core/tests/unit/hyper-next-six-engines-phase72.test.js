import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {inspectReviewCheckpointFreshness} from "../../next-engines/orchestration/review-checkpoint-freshness.js";
const key=Buffer.alloc(32,91),wrong=Buffer.alloc(32,92);
const digest="a".repeat(64),other="b".repeat(64);
const checkpoint=(version=7)=>createReviewReplayRollbackAnchor({
 version,digest,key});
const inspect=(options={})=>inspectReviewCheckpointFreshness({
 checkpoint:checkpoint(),checkpointId:"checkpoint-7",
 minimumSequence:7,expectedDigest:digest,key,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 72 — checkpoint freshness and replay",()=>{
 it("observes an authenticated checkpoint above a trusted floor",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"checkpoint_freshness_observed_for_manual_review",
   checkpointId:"checkpoint-7",sequence:7});denied(result);
 });
 it("blocks a previously accepted checkpoint identity",()=>{
  const result=inspect({previouslyAcceptedCheckpointIds:["checkpoint-7"]});
  expect(result.findings).toContain("CHECKPOINT_REPLAYED");denied(result);
 });
 it("blocks an anchor older than the trusted sequence floor",()=>{
  const result=inspect({checkpoint:checkpoint(6)});
  expect(result.findings).toContain("ANCHOR_ROLLBACK_DETECTED");denied(result);
 });
 it("blocks a changed expected registry digest",()=>{
  const result=inspect({expectedDigest:other});
  expect(result.findings).toContain("REGISTRY_ROLLBACK_OR_TAMPERING");denied(result);
 });
 it("blocks incorrect signing keys and tampered tags",()=>{
  denied(inspect({key:wrong}));
  denied(inspect({checkpoint:{...checkpoint(),authenticationTag:"0".repeat(64)}}));
 });
 it("blocks a corrupted or duplicate replay ledger",()=>{
  const result=inspect({previouslyAcceptedCheckpointIds:["checkpoint-1","checkpoint-1"]});
  expect(result.findings).toContain("CHECKPOINT_LEDGER_UNVERIFIED");denied(result);
  denied(inspect({previouslyAcceptedCheckpointIds:new Array(1)}));
 });
 it("blocks hostile checkpoint properties and missing checkpoints",()=>{
  const hostile={...checkpoint()};
  Object.defineProperty(hostile,"sequence",{get(){throw Error("unsafe");}});
  denied(inspect({checkpoint:hostile}));
  denied(inspect({checkpoint:null}));
 });
 it("enforces bounded replay ledger and trusted configuration",()=>{
  expect(()=>inspect({maxAcceptedIds:0})).toThrow();
  expect(()=>inspect({minimumSequence:-1})).toThrow();
  expect(()=>inspect({previouslyAcceptedCheckpointIds:["a","b"],maxAcceptedIds:1})).toThrow();
 });
});
