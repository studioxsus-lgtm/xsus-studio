import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {proposeReviewAnchorTransition} from "../../next-engines/orchestration/review-anchor-transition.js";
import {assessReviewAnchorConcurrency} from "../../next-engines/orchestration/review-anchor-concurrency.js";
const key=Buffer.alloc(32,31),wrong=Buffer.alloc(32,32);
const oldDigest="a".repeat(64),newDigest="b".repeat(64),otherDigest="c".repeat(64);
const current=()=>createReviewReplayRollbackAnchor({version:5,digest:oldDigest,key});
const proposal=(nextDigest=newDigest)=>proposeReviewAnchorTransition({
 currentAnchor:current(),currentDigest:oldDigest,nextDigest,key,minimumSequence:5});
const assess=(proposals,options={})=>assessReviewAnchorConcurrency({
 currentAnchor:current(),currentDigest:oldDigest,proposals,key,minimumSequence:5,...options});
const denied=result=>expect(result).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 66 — concurrent anchor transition conflicts",()=>{
 it("classifies a single authenticated proposal as manual-review only",()=>{
  const result=assess([proposal()]);
  expect(result).toMatchObject({state:"transition_consistent_for_manual_review",
   expectedSequence:5,proposedSequence:6,proposalCount:1});denied(result);
 });
 it("accepts identical proposals without claiming CAS success",()=>{
  const result=assess([proposal(),proposal()]);
  expect(result.state).toBe("transition_consistent_for_manual_review");denied(result);
 });
 it("blocks competing proposals targeting different registry digests",()=>{
  const result=assess([proposal(),proposal(otherDigest)]);
  expect(result.findings).toContain("CONCURRENT_TRANSITION_CONFLICT");denied(result);
 });
 it("rejects a forged proposal carrying an unauthenticated next anchor",()=>{
  const p=proposal();
  const forged={...p,nextAnchor:{...p.nextAnchor,registryDigest:otherDigest}};
  const result=assess([forged]);
  expect(result.findings).toContain("PROPOSAL_UNVERIFIED");denied(result);
 });
 it("rejects stale expected sequence metadata",()=>{
  const result=assess([{...proposal(),expectedSequence:4}]);
  expect(result.findings).toContain("PROPOSAL_UNVERIFIED");denied(result);
 });
 it("blocks incorrect trusted anchor authentication",()=>{
  const result=assess([proposal()],{key:wrong});
  expect(result.state).toBe("anchor_conflict_blocked");denied(result);
 });
 it("blocks hostile proposal accessors and sparse arrays",()=>{
  const hostile={...proposal()};
  Object.defineProperty(hostile,"nextAnchor",{get(){throw Error("getter");}});
  denied(assess([hostile]));
  const sparse=new Array(1);
  expect(assess(sparse).state).toBe("anchor_conflict_blocked");
 });
 it("enforces bounded input without reading untrusted proposals",()=>{
  expect(()=>assess([proposal()],{maxProposals:0})).toThrow();
  expect(()=>assess(Array.from({length:33},()=>proposal()))).toThrow();
 });
});
