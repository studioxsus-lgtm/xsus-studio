import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {proposeReviewAnchorTransition,inspectReviewAnchorTransition} from "../../next-engines/orchestration/review-anchor-transition.js";
const key=Buffer.alloc(32,21),wrong=Buffer.alloc(32,22);
const oldDigest="a".repeat(64),newDigest="b".repeat(64);
const anchor=(version=5)=>createReviewReplayRollbackAnchor({
 version,digest:oldDigest,key});
const propose=(options={})=>proposeReviewAnchorTransition({
 currentAnchor:anchor(),currentDigest:oldDigest,nextDigest:newDigest,
 key,minimumSequence:5,...options});
const denied=result=>expect(result).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 65 — monotonic anchor transitions",()=>{
 it("proposes exactly one authenticated sequence increment",()=>{
  const result=propose();
  expect(result).toMatchObject({state:"transition_proposed",
   expectedSequence:5,nextAnchor:{sequence:6,registryDigest:newDigest}});
  denied(result);
 });
 it("confirms externally observed next anchor without granting recovery",()=>{
  const proposal=propose();
  const result=inspectReviewAnchorTransition({
   proposal,observedAnchor:proposal.nextAnchor,key});
  expect(result.state).toBe("anchor_transition_observed");denied(result);
 });
 it("blocks a stale trusted anchor below the minimum sequence",()=>{
  const result=propose({currentAnchor:anchor(4)});
  expect(result.findings).toContain("ANCHOR_ROLLBACK_DETECTED");denied(result);
 });
 it("blocks unchanged registry digests",()=>{
  const result=propose({nextDigest:oldDigest});
  expect(result.findings).toContain("NO_REGISTRY_CHANGE");denied(result);
 });
 it("blocks an anchor signed with a different key",()=>{
  const result=propose({key:wrong});
  expect(result.findings).toContain("ANCHOR_AUTHENTICATION_FAILED");denied(result);
 });
 it("rejects an observed stale anchor",()=>{
  const result=inspectReviewAnchorTransition({
   proposal:propose(),observedAnchor:anchor(),key});
  expect(result.state).toBe("anchor_transition_blocked");denied(result);
 });
 it("blocks unsafe proposal metadata and exhausted sequence numbers",()=>{
  const proposal=propose();
  const hostile={...proposal};
  Object.defineProperty(hostile,"nextAnchor",{get(){throw Error("unsafe");}});
  denied(inspectReviewAnchorTransition({
   proposal:hostile,observedAnchor:proposal.nextAnchor,key}));
  const maximum=createReviewReplayRollbackAnchor({
   version:Number.MAX_SAFE_INTEGER,digest:oldDigest,key});
  const result=propose({currentAnchor:maximum,
   minimumSequence:Number.MAX_SAFE_INTEGER});
  expect(result.findings).toContain("SEQUENCE_EXHAUSTED");
 });
});
