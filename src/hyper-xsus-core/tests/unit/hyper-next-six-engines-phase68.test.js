import {describe,it,expect} from "vitest";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
import {inspectReviewAnchorRestartContinuity} from "../../next-engines/orchestration/review-anchor-restart-continuity.js";
const key=Buffer.alloc(32,51),wrong=Buffer.alloc(32,52);
const digest="a".repeat(64),other="b".repeat(64);
const anchor=(version=5,hash=digest)=>createReviewReplayRollbackAnchor({
 version,digest:hash,key});
const before=()=>({epoch:"boot-1",registryDigest:digest,anchor:anchor()});
const after=()=>({epoch:"boot-2",registryDigest:digest,anchor:anchor()});
const inspect=(options={})=>inspectReviewAnchorRestartContinuity({
 before:before(),after:after(),key,minimumSequence:5,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 68 — restart continuity observation",()=>{
 it("observes matching authenticated state across distinct epochs",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"restart_continuity_observed_for_manual_review",
   sequence:5,registryDigest:digest});denied(result);
 });
 it("blocks a rollback after the restart",()=>{
  const result=inspect({after:{...after(),anchor:anchor(4)}});
  expect(result.findings).toContain("ANCHOR_ROLLBACK_DETECTED");denied(result);
 });
 it("blocks changed registry digest after restart",()=>{
  const result=inspect({after:{...after(),registryDigest:other}});
  expect(result.state).toBe("restart_continuity_blocked");denied(result);
 });
 it("blocks a forward transition without an explicit continuity protocol",()=>{
  const result=inspect({after:{...after(),registryDigest:other,
   anchor:anchor(6,other)}});
  expect(result.findings).toContain("RESTART_STATE_DIVERGED");denied(result);
 });
 it("blocks identical epochs that do not establish a restart boundary",()=>{
  const result=inspect({after:{...after(),epoch:"boot-1"}});
  expect(result.findings).toContain("RESTART_EPOCH_UNVERIFIED");denied(result);
 });
 it("blocks incorrect keys and forged authentication tags",()=>{
  denied(inspect({key:wrong}));
  denied(inspect({after:{...after(),anchor:{...anchor(),
   authenticationTag:"0".repeat(64)}}}));
 });
 it("blocks missing observations and hostile accessors",()=>{
  denied(inspect({after:null}));
  const hostile={...after()};
  Object.defineProperty(hostile,"anchor",{get(){throw Error("unsafe");}});
  expect(inspect({after:hostile}).state).toBe("restart_continuity_blocked");
 });
 it("rejects invalid configuration without authorizing recovery",()=>{
  expect(()=>inspect({minimumSequence:-1})).toThrow();
  expect(()=>inspect({key:Buffer.alloc(8)})).toThrow();
 });
});
