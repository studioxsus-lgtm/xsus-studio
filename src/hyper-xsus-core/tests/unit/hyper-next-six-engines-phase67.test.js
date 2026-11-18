import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {proposeReviewAnchorTransition} from "../../next-engines/orchestration/review-anchor-transition.js";
import {inspectReviewAnchorCasOutcome} from "../../next-engines/orchestration/review-anchor-cas-outcome.js";
const key=Buffer.alloc(32,41),wrong=Buffer.alloc(32,42);
const oldDigest="a".repeat(64),nextDigest="b".repeat(64);
const current=()=>createReviewReplayRollbackAnchor({version:5,digest:oldDigest,key});
const proposal=()=>proposeReviewAnchorTransition({
 currentAnchor:current(),currentDigest:oldDigest,nextDigest,key,minimumSequence:5});
const inspect=(options={})=>{
 const p=proposal();
 return inspectReviewAnchorCasOutcome({
  proposal:p,providerOutcome:{status:"applied",
   expectedSequence:p.expectedSequence,expectedTag:p.expectedTag},
  observedAnchor:p.nextAnchor,key,...options});
};
const denied=result=>expect(result).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 67 — external CAS outcome inspection",()=>{
 it("recognizes matching applied outcome as manual-review only",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"cas_outcome_observed_for_manual_review",
   sequence:6,registryDigest:nextDigest});denied(result);
 });
 it("blocks a reported compare-and-swap conflict",()=>{
  const result=inspect({providerOutcome:{status:"conflict"}});
  expect(result.findings).toContain("CAS_CONFLICT");denied(result);
 });
 it("blocks an interrupted external update without retrying",()=>{
  const result=inspect({providerOutcome:{status:"interrupted"}});
  expect(result.findings).toContain("CAS_INTERRUPTED");denied(result);
 });
 it("blocks unknown or missing provider status",()=>{
  denied(inspect({providerOutcome:{status:"pending"}}));
  denied(inspect({providerOutcome:null}));
 });
 it("rejects forged expected CAS preconditions",()=>{
  const result=inspect({providerOutcome:{status:"applied",
   expectedSequence:4,expectedTag:"0".repeat(64)}});
  expect(result.findings).toContain("CAS_PRECONDITION_MISMATCH");denied(result);
 });
 it("rejects a stale observed anchor even if provider reports success",()=>{
  const result=inspect({observedAnchor:current()});
  expect(result.state).toBe("cas_outcome_blocked");denied(result);
 });
 it("rejects an untrusted proposal and wrong verification key",()=>{
  const p=proposal();
  denied(inspect({proposal:{...p,nextAnchor:{...p.nextAnchor,
   authenticationTag:"0".repeat(64)}}}));
  denied(inspect({key:wrong}));
 });
 it("rejects accessor-backed provider status",()=>{
  const provider={};
  Object.defineProperty(provider,"status",{get(){throw Error("hostile");}});
  const result=inspect({providerOutcome:provider});
  expect(result.findings).toContain("CAS_OUTCOME_UNVERIFIED");denied(result);
 });
});
