import {describe,it,expect} from "vitest";
import {inspectReviewWitnessDecisionAuditContinuity} from "../../next-engines/orchestration/review-witness-decision-audit-continuity.js";
import {inspectReviewWitnessDecisionAuditCheckpoints} from "../../next-engines/orchestration/review-witness-decision-audit-checkpoints.js";
import {inspectReviewWitnessDecisionAuditCheckpointManifest} from "../../next-engines/orchestration/review-witness-decision-audit-checkpoint-manifest.js";
import {inspectReviewWitnessDecisionAuditManifestContinuity} from "../../next-engines/orchestration/review-witness-decision-audit-manifest-continuity.js";

const flags={recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"};
const key=Buffer.alloc(32,13);
const ids=["report-a","report-b"];
const digests=["a".repeat(64),"b".repeat(64)];
const base={records:[{},{}],expectedReportIds:ids,expectedReportDigests:digests,
 expectedFirstSequence:0,expectedLastSequence:1,
 auditKey:key,expectedIssuerId:"issuer-1"};
const blocked=result=>{
 expect(result).toMatchObject(flags);
 expect(result.state).toMatch(/blocked$/);
 expect(result.findings).toHaveLength(1);
 expect(Object.isFrozen(result)).toBe(true);
 expect(Object.isFrozen(result.findings)).toBe(true);
};
describe("Hyper phase 100 — final fail-closed contract regression gate",()=>{
 it("phase95 blocks missing sequence fields without actions",()=>{
  blocked(inspectReviewWitnessDecisionAuditContinuity(base));
 });
 it("phase97 blocks invalid report evidence without actions",()=>{
  blocked(inspectReviewWitnessDecisionAuditCheckpoints(base));
 });
 it("phase98 blocks unauthenticated manifest without actions",()=>{
  blocked(inspectReviewWitnessDecisionAuditCheckpointManifest({
   ...base,manifest:{version:1,manifestId:"manifest-1",authenticationTag:"0".repeat(64)},
   manifestKey:key,expectedManifestId:"manifest-1",trustedManifestTag:"0".repeat(64)
  }));
 });
 it("phase99 blocks missing independently trusted manifests without actions",()=>{
  blocked(inspectReviewWitnessDecisionAuditManifestContinuity({
   earlier:{context:{expectedIssuerId:"issuer-1",expectedFirstSequence:0,
    expectedLastSequence:1},expectedManifestId:"manifest-a"},
   later:{context:{expectedIssuerId:"issuer-1",expectedFirstSequence:2,
    expectedLastSequence:3},expectedManifestId:"manifest-b"},
   expectedIssuerId:"issuer-1",expectedFirstSequence:0,expectedLastSequence:3
  }));
 });
 it("phase95 rejects weak keys at its trust boundary",()=>{
  expect(()=>inspectReviewWitnessDecisionAuditContinuity({
   ...base,auditKey:Buffer.alloc(4)})).toThrow();
 });
 it("phase97 rejects mismatched externally trusted digest counts",()=>{
  expect(()=>inspectReviewWitnessDecisionAuditCheckpoints({
   ...base,expectedReportDigests:[digests[0]]})).toThrow();
 });
 it("phase98 rejects weak independently trusted manifest keys",()=>{
  expect(()=>inspectReviewWitnessDecisionAuditCheckpointManifest({
   ...base,manifestKey:Buffer.alloc(3),expectedManifestId:"manifest-1",
   trustedManifestTag:"0".repeat(64)})).toThrow();
 });
 it("phase99 rejects impossible externally trusted ranges",()=>{
  expect(()=>inspectReviewWitnessDecisionAuditManifestContinuity({
   expectedIssuerId:"issuer-1",expectedFirstSequence:9,expectedLastSequence:2
  })).toThrow();
 });
});
