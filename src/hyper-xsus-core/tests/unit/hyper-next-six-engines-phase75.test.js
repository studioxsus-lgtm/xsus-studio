import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt,inspectReviewAdmissionLedgerIntegrity} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
const key=Buffer.alloc(32,121),wrong=Buffer.alloc(32,122);
const ledger=()=>({revision:5,minimumSequence:8,registryDigest:"a".repeat(64),
 acceptedCheckpointIds:["cp-7","cp-8"]});
const receipt=()=>createReviewAdmissionLedgerIntegrityReceipt({ledger:ledger(),ledgerId:"ledger-1",key});
const inspect=(options={})=>inspectReviewAdmissionLedgerIntegrity({
 ledger:ledger(),ledgerId:"ledger-1",receipt:receipt(),key,
 minimumRevision:5,minimumSequence:8,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 75 — admission ledger integrity",()=>{
 it("authenticates canonical ledger content for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"admission_ledger_integrity_observed_for_manual_review",
   ledgerId:"ledger-1",revision:5,acceptedCount:2});denied(result);
 });
 it("accepts harmless reordering of checkpoint IDs",()=>{
  const result=inspect({ledger:{...ledger(),acceptedCheckpointIds:["cp-8","cp-7"]}});
  expect(result.state).toBe("admission_ledger_integrity_observed_for_manual_review");denied(result);
 });
 it("rejects lost or substituted accepted checkpoint identities",()=>{
  denied(inspect({ledger:{...ledger(),acceptedCheckpointIds:["cp-7"]}}));
  denied(inspect({ledger:{...ledger(),acceptedCheckpointIds:["cp-7","cp-9"]}}));
 });
 it("rejects a modified revision, sequence or registry digest",()=>{
  denied(inspect({ledger:{...ledger(),revision:6}}));
  denied(inspect({ledger:{...ledger(),minimumSequence:9}}));
  denied(inspect({ledger:{...ledger(),registryDigest:"b".repeat(64)}}));
 });
 it("rejects ledger identity substitution and wrong keys",()=>{
  denied(inspect({ledgerId:"ledger-2"}));
  denied(inspect({key:wrong}));
 });
 it("rejects authenticated old snapshots below trusted monotonic floors",()=>{
  const old={...ledger(),revision:4,minimumSequence:7};
  const oldReceipt=createReviewAdmissionLedgerIntegrityReceipt({
   ledger:old,ledgerId:"ledger-1",key});
  const result=inspect({ledger:old,receipt:oldReceipt});
  expect(result.findings).toContain("LEDGER_ROLLBACK_DETECTED");denied(result);
 });
 it("rejects duplicate IDs, sparse arrays and hostile accessors",()=>{
  denied(inspect({ledger:{...ledger(),acceptedCheckpointIds:["cp-7","cp-7"]}}));
  denied(inspect({ledger:{...ledger(),acceptedCheckpointIds:new Array(2)}}));
  const hostile={...ledger()};
  Object.defineProperty(hostile,"revision",{get(){throw Error("unsafe");}});
  denied(inspect({ledger:hostile}));
 });
 it("rejects forged tags and invalid configuration",()=>{
  denied(inspect({receipt:{...receipt(),authenticationTag:"0".repeat(64)}}));
  expect(()=>inspect({maxAcceptedIds:0})).toThrow();
  expect(()=>inspect({minimumRevision:-1})).toThrow();
 });
});
