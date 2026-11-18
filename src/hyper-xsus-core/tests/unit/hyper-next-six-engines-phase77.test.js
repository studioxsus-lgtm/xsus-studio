import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {inspectReviewLedgerWitnessConsensus} from "../../next-engines/orchestration/review-ledger-witness-consensus.js";
const key=Buffer.alloc(32,141),ledgerId="ledger-1";
const observation=(witnessId,changes={})=>{
 const ledger={revision:5,minimumSequence:8,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"],...changes};
 return {witnessId,ledger,receipt:createReviewAdmissionLedgerIntegrityReceipt({
  ledger,ledgerId,key})};
};
const inspect=(options={})=>inspectReviewLedgerWitnessConsensus({
 observations:[observation("w-1"),observation("w-2")],ledgerId,key,
 expectedRevision:5,minimumSequence:8,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 77 — independent witness observation comparison",()=>{
 it("observes matching authenticated snapshots from distinct witness IDs",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"ledger_witness_agreement_observed_for_manual_review",
   witnessCount:2,revision:5});denied(result);
 });
 it("blocks authenticated forks at the same revision",()=>{
  const result=inspect({observations:[observation("w-1"),
   observation("w-2",{acceptedCheckpointIds:["cp-7","cp-9"]})]});
  expect(result.findings).toContain("WITNESS_LEDGER_FORK_DETECTED");denied(result);
 });
 it("blocks duplicate witness identities",()=>{
  const result=inspect({observations:[observation("w-1"),observation("w-1")]});
  expect(result.findings).toContain("WITNESS_IDENTITY_DUPLICATE_OR_INVALID");denied(result);
 });
 it("blocks observations at different revisions",()=>{
  const result=inspect({observations:[observation("w-1"),
   observation("w-2",{revision:6})]});
  expect(result.findings).toContain("WITNESS_REVISION_MISMATCH");denied(result);
 });
 it("blocks a forged witness receipt",()=>{
  const forged=observation("w-2");
  forged.receipt={...forged.receipt,authenticationTag:"0".repeat(64)};
  const result=inspect({observations:[observation("w-1"),forged]});
  expect(result.findings).toContain("WITNESS_LEDGER_UNVERIFIED");denied(result);
 });
 it("blocks stale snapshots below the trusted floor",()=>{
  denied(inspect({minimumSequence:9}));
  denied(inspect({expectedRevision:6}));
 });
 it("blocks insufficient observations and invalid bounds",()=>{
  expect(()=>inspect({observations:[observation("w-1")]})).toThrow();
  expect(()=>inspect({requiredWitnesses:1})).toThrow();
  expect(()=>inspect({maxWitnesses:1})).toThrow();
 });
 it("blocks hostile accessors and sparse observation arrays",()=>{
  const hostile=observation("w-2");
  Object.defineProperty(hostile,"witnessId",{get(){throw Error("unsafe");}});
  denied(inspect({observations:[observation("w-1"),hostile]}));
  denied(inspect({observations:new Array(2)}));
 });
});
