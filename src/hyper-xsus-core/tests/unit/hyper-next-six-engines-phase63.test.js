import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor,verifyReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
const key=Buffer.alloc(32,11),wrong=Buffer.alloc(32,12);
const digest="a".repeat(64);
const anchor=(sequence=5)=>createReviewReplayRollbackAnchor({version:sequence,digest,key});
const check=(value,options={})=>verifyReviewReplayRollbackAnchor({
 anchor:value,registryDigest:digest,minimumSequence:5,key,...options});
const denied=value=>expect(value).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 63 — trusted rollback anchors",()=>{
 it("verifies a matching authenticated anchor without granting recovery",()=>{
  const result=check(anchor());
  expect(result.state).toBe("rollback_anchor_verified");denied(result);
 });
 it("rejects a registry digest mismatch",()=>{
  const result=check(anchor(),{registryDigest:"b".repeat(64)});
  expect(result.findings).toContain("REGISTRY_ROLLBACK_OR_TAMPERING");denied(result);
 });
 it("rejects a previously valid but older anchor",()=>{
  const result=check(anchor(4));
  expect(result.findings).toContain("ANCHOR_ROLLBACK_DETECTED");denied(result);
 });
 it("rejects a wrong authentication key",()=>{
  const result=check(anchor(),{key:wrong});
  expect(result.findings).toContain("ANCHOR_AUTHENTICATION_FAILED");denied(result);
 });
 it("rejects modified sequence metadata",()=>{
  const result=check({...anchor(),sequence:6});
  expect(result.findings).toContain("ANCHOR_AUTHENTICATION_FAILED");denied(result);
 });
 it("blocks missing anchors and hostile property accessors",()=>{
  denied(check(undefined));
  const hostile={...anchor()};
  Object.defineProperty(hostile,"registryDigest",{get(){throw Error("unsafe");}});
  expect(check(hostile).state).toBe("rollback_unverified");
 });
 it("rejects short keys and malformed anchor digests",()=>{
  expect(()=>createReviewReplayRollbackAnchor({
   version:1,digest,key:Buffer.alloc(8)})).toThrow();
  expect(check({...anchor(),registryDigest:"invalid"}).state)
   .toBe("rollback_unverified");
 });
});
