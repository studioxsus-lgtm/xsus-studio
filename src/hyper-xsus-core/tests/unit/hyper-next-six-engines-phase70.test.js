import {describe,it,expect} from "vitest";
import {createReviewStorageDurabilityReceipt} from "../../next-engines/orchestration/review-storage-durability-receipt.js";
import {inspectReviewDurabilityTransitionHistory} from "../../next-engines/orchestration/review-durability-transition-history.js";
const key=Buffer.alloc(32,71);
const hashes=["a".repeat(64),"b".repeat(64),"c".repeat(64)];
const record=(operationId,sequence,previousRegistryDigest,registryDigest)=>{
 const storageEpoch="boot-2";
 return {operationId,sequence,previousRegistryDigest,registryDigest,storageEpoch,
  receipt:createReviewStorageDurabilityReceipt({
   operationId,sequence,registryDigest,storageEpoch,key})};
};
const chain=()=>[record("op-1",6,hashes[0],hashes[1]),
 record("op-2",7,hashes[1],hashes[2])];
const inspect=(records=chain(),options={})=>inspectReviewDurabilityTransitionHistory({
 records,startingSequence:5,startingDigest:hashes[0],key,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 70 — durability transition history",()=>{
 it("accepts an authenticated consecutive chain for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"durability_history_consistent_for_manual_review",
   endingSequence:7,endingDigest:hashes[2],recordCount:2});denied(result);
 });
 it("blocks skipped sequence numbers",()=>{
  const records=chain();records[1]={...records[1],sequence:8};
  const result=inspect(records);
  expect(result.findings).toContain("HISTORY_TRANSITION_DISCONTINUITY");denied(result);
 });
 it("blocks broken digest linkage",()=>{
  const records=chain();records[1]={...records[1],previousRegistryDigest:hashes[0]};
  const result=inspect(records);
  expect(result.findings).toContain("HISTORY_TRANSITION_DISCONTINUITY");denied(result);
 });
 it("blocks duplicate operation identities",()=>{
  const records=chain();records[1]=record("op-1",7,hashes[1],hashes[2]);
  const result=inspect(records);
  expect(result.findings).toContain("HISTORY_OPERATION_REPLAYED");denied(result);
 });
 it("blocks operations already present in the trusted replay ledger",()=>{
  const result=inspect(chain(),{previouslyAcceptedOperationIds:["op-1"]});
  expect(result.findings).toContain("HISTORY_OPERATION_REPLAYED");denied(result);
 });
 it("rejects tampered receipt authentication",()=>{
  const records=chain();records[1]={...records[1],
   receipt:{...records[1].receipt,authenticationTag:"0".repeat(64)}};
  const result=inspect(records);
  expect(result.findings).toContain("RECEIPT_AUTHENTICATION_FAILED");denied(result);
 });
 it("rejects sparse history and hostile record accessors",()=>{
  denied(inspect(new Array(1)));
  const records=chain();
  Object.defineProperty(records[0],"operationId",{get(){throw Error("unsafe");}});
  denied(inspect(records));
 });
 it("rejects oversized histories and invalid trusted start",()=>{
  expect(()=>inspect(chain(),{maxRecords:1})).toThrow();
  expect(()=>inspect(chain(),{startingSequence:-1})).toThrow();
 });
});
