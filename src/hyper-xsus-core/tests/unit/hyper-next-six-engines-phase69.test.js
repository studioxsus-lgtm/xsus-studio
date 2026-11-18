import {describe,it,expect} from "vitest";
import {createReviewStorageDurabilityReceipt,inspectReviewStorageDurabilityReceipt} from "../../next-engines/orchestration/review-storage-durability-receipt.js";
const key=Buffer.alloc(32,61),wrong=Buffer.alloc(32,62);
const input={operationId:"op-001",sequence:6,
 registryDigest:"a".repeat(64),storageEpoch:"boot-2"};
const receipt=()=>createReviewStorageDurabilityReceipt({...input,key});
const inspect=(options={})=>inspectReviewStorageDurabilityReceipt({
 receipt:receipt(),...input,key,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 69 — authenticated storage durability claims",()=>{
 it("authenticates a matching claim without granting recovery",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"durability_claim_authenticated_for_manual_review",
   operationId:"op-001",sequence:6});denied(result);
 });
 it("rejects a different operation identity",()=>{
  const result=inspect({operationId:"op-002"});
  expect(result.findings).toContain("RECEIPT_CONTEXT_MISMATCH");denied(result);
 });
 it("rejects a changed sequence or registry digest",()=>{
  denied(inspect({sequence:7}));
  denied(inspect({registryDigest:"b".repeat(64)}));
 });
 it("rejects a changed storage epoch",()=>{
  const result=inspect({storageEpoch:"boot-3"});
  expect(result.findings).toContain("RECEIPT_CONTEXT_MISMATCH");denied(result);
 });
 it("rejects replayed operation identities in a caller-managed ledger",()=>{
  const result=inspect({previouslyAcceptedOperationIds:["op-001"]});
  expect(result.findings).toContain("DURABILITY_RECEIPT_REPLAYED");denied(result);
 });
 it("rejects incorrect signing keys and modified tags",()=>{
  denied(inspect({key:wrong}));
  denied(inspect({receipt:{...receipt(),authenticationTag:"0".repeat(64)}}));
 });
 it("rejects missing or accessor-backed receipts",()=>{
  denied(inspect({receipt:null}));
  const hostile={...receipt()};
  Object.defineProperty(hostile,"operationId",{get(){throw Error("unsafe");}});
  expect(inspect({receipt:hostile}).state).toBe("durability_receipt_blocked");
 });
 it("rejects invalid configuration and oversized replay lists",()=>{
  expect(()=>inspect({operationId:"bad id"})).toThrow();
  expect(()=>inspect({previouslyAcceptedOperationIds:Array(10001).fill("x")})).toThrow();
 });
});
