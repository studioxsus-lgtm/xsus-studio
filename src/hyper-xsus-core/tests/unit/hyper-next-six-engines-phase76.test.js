import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {inspectReviewAdmissionLedgerContinuity} from "../../next-engines/orchestration/review-admission-ledger-continuity.js";
const key=Buffer.alloc(32,131),ledgerId="ledger-1";
const snapshot=(revision,minimumSequence,ids,digest="a".repeat(64))=>{
 const ledger={revision,minimumSequence,registryDigest:digest,acceptedCheckpointIds:ids};
 return {ledger,receipt:createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key})};
};
const snapshots=()=>[snapshot(5,8,["cp-7","cp-8"]),
 snapshot(6,9,["cp-7","cp-8","cp-9"])];
const inspect=(options={})=>inspectReviewAdmissionLedgerContinuity({
 snapshots:snapshots(),ledgerId,key,minimumRevision:5,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 76 — authenticated ledger continuity",()=>{
 it("observes an authenticated consecutive transition for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"admission_ledger_continuity_observed_for_manual_review",
   endingRevision:6,endingSequence:9,snapshotCount:2});denied(result);
 });
 it("blocks a fork at the same authenticated revision",()=>{
  const result=inspect({snapshots:[snapshots()[0],
   snapshot(5,8,["cp-7","cp-10"])]});
  expect(result.findings).toContain("LEDGER_FORK_DETECTED");denied(result);
 });
 it("blocks replay of the same authenticated snapshot",()=>{
  const first=snapshots()[0],result=inspect({snapshots:[first,first]});
  expect(result.findings).toContain("LEDGER_SNAPSHOT_REPLAYED");denied(result);
 });
 it("blocks a missing intermediate revision",()=>{
  const result=inspect({snapshots:[snapshots()[0],
   snapshot(7,10,["cp-7","cp-8","cp-9"])]});
  expect(result.findings).toContain("LEDGER_REVISION_DISCONTINUITY");denied(result);
 });
 it("blocks removed accepted checkpoint identities",()=>{
  const result=inspect({snapshots:[snapshots()[0],
   snapshot(6,9,["cp-8","cp-9","cp-10"])]});
  expect(result.findings).toContain("LEDGER_ACCEPTANCE_REMOVED");denied(result);
 });
 it("blocks missing admissions and unchanged sequence floors",()=>{
  denied(inspect({snapshots:[snapshots()[0],
   snapshot(6,9,["cp-7","cp-8"])]}));
  const result=inspect({snapshots:[snapshots()[0],
   snapshot(6,8,["cp-7","cp-8","cp-9"])]});
  expect(result.findings).toContain("LEDGER_SEQUENCE_NOT_ADVANCED");denied(result);
 });
 it("blocks tampered MACs and trusted floor rollback",()=>{
  const pair=snapshots();pair[1]={...pair[1],
   receipt:{...pair[1].receipt,authenticationTag:"0".repeat(64)}};
  denied(inspect({snapshots:pair}));
  denied(inspect({minimumRevision:6}));
 });
 it("blocks sparse arrays, hostile accessors and invalid bounds",()=>{
  denied(inspect({snapshots:new Array(2)}));
  const pair=snapshots(),hostile={};
  Object.defineProperty(hostile,"ledger",{get(){throw Error("unsafe");}});
  pair[1]=hostile;denied(inspect({snapshots:pair}));
  expect(()=>inspect({maxSnapshots:1})).toThrow();
 });
});
