import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
import {createReviewWitnessDecisionCasReceipt} from "../../next-engines/orchestration/review-witness-decision-cas-outcome.js";
import {createReviewWitnessDecisionRestartReceipt} from "../../next-engines/orchestration/review-witness-decision-restart-continuity.js";
import {createReviewWitnessDecisionHistoryAnchor} from "../../next-engines/orchestration/review-witness-decision-history-anchor.js";
import {inspectReviewWitnessDecisionAnchorAudit} from "../../next-engines/orchestration/review-witness-decision-anchor-audit.js";
import {createReviewWitnessDecisionAuditAuthentication} from "../../next-engines/orchestration/review-witness-decision-audit-authentication.js";
import {inspectReviewWitnessDecisionAuditCheckpoints} from "../../next-engines/orchestration/review-witness-decision-audit-checkpoints.js";
const ledgerId="ledger-1",ledgerKey=Buffer.alloc(32,221),chainKey=Buffer.alloc(32,222),reviewKey=Buffer.alloc(32,223);
const round=(i,variant="a")=>{
 const revision=5+i,challenge="nonce-"+i+"-"+variant;
 const ledger={revision,minimumSequence:8+i,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let j=0;j<2;j++){
  const witnessId="w-"+j,keyId="key-"+i+"-"+variant+"-"+j;
  const witnessKey=Buffer.alloc(32,224+i*2+j+(variant==="b"?20:0));
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:witnessKey,status:"active",
   validFromRevision:i===0?4:revision,validThroughRevision:revision}};
 }
 return {challenge,observations,attestations,keyRegistry};
};
const opts={ledgerId,ledgerKey,chainKey,startingRevision:5,minimumSequence:8};
const make=(fork=false)=>{
 const base=[round(0),round(1),round(2)];
 const previousChain=createReviewWitnessRotationChain({...opts,rounds:base});
 const candidate=rounds=>{
  const chain=createReviewWitnessRotationChain({...opts,rounds});
  return {rounds,chain,trustedHeadTag:chain.headTag,trustedRoundCount:rounds.length};
 };
 const candidates=[candidate([...base,round(3)]),
  candidate([...base,round(3,fork?"b":"a")])];
 const decision=createReviewWitnessConflictDecision({
  ledgerId,baseHead:previousChain.headTag,
  firstHead:candidates[0].trustedHeadTag,secondHead:candidates[1].trustedHeadTag,
  decisionId:"decision-85",reviewerId:"reviewer-1",
  disposition:"escalate",reviewKey});
 return {...opts,previousRounds:base,previousChain,
  trustedPreviousHeadTag:previousChain.headTag,trustedPreviousRoundCount:3,
  candidates,decision,reviewKey,expectedDecisionId:"decision-85",
  expectedReviewerId:"reviewer-1"};
};
const authorityKey=Buffer.alloc(32,231);
const makeCas=(outcome="committed")=>{
 const beforeRegistry={ledgerId,revision:9,minimumRevision:5,consumedDecisionIds:[]};
 const afterRegistry=outcome==="committed"?
  {ledgerId,revision:10,minimumRevision:5,consumedDecisionIds:["decision-85"]}:
  {...beforeRegistry,consumedDecisionIds:[]};
 const receipt=createReviewWitnessDecisionCasReceipt({
  decisionId:"decision-85",attemptId:"attempt-87",outcome,
  beforeRegistry,afterRegistry,authorityKey});
 return {...make(),beforeRegistry,afterRegistry,receipt,authorityKey,
  expectedAttemptId:"attempt-87",expectedRegistryRevision:9,
  expectedMinimumRevision:5};
};
const makeRestart=()=>{
 const data=makeCas(),postRestartRegistry={...data.afterRegistry,
  consumedDecisionIds:[...data.afterRegistry.consumedDecisionIds]};
 const restartReceipt=createReviewWitnessDecisionRestartReceipt({
  epochId:"epoch-after",attemptId:"attempt-87",decisionId:"decision-85",
  registry:postRestartRegistry,authorityKey});
 return {...data,postRestartRegistry,restartReceipt,
  expectedBeforeEpochId:"epoch-before",expectedAfterEpochId:"epoch-after"};
};
const makeHistory=()=>{
 const data=makeRestart();
 const nextRegistry={...data.postRestartRegistry,revision:11,
  consumedDecisionIds:[...data.postRestartRegistry.consumedDecisionIds,"other-decision"]};
 const nextReceipt=createReviewWitnessDecisionRestartReceipt({
  epochId:"epoch-third",attemptId:"attempt-87",decisionId:"decision-85",
  registry:nextRegistry,authorityKey});
 return {...data,observations:[
  {registry:data.postRestartRegistry,receipt:data.restartReceipt},
  {registry:nextRegistry,receipt:nextReceipt}],
  expectedEpochIds:["epoch-after","epoch-third"]};
};
const anchorKey=Buffer.alloc(32,241);
const makeAnchored=()=>{
 const data=makeHistory();
 const anchor=createReviewWitnessDecisionHistoryAnchor({
  ledgerId,decisionId:"decision-85",attemptId:"attempt-87",
  expectedBeforeEpochId:"epoch-before",observations:data.observations,
  expectedEpochIds:data.expectedEpochIds,anchorKey});
 return {...data,anchor,anchorKey,trustedAnchorTag:anchor.authenticationTag,
  trustedObservationCount:2};
};
const makeAnchorContinuity=()=>{
 const data=makeAnchored();
 const earlier={observations:data.observations,expectedEpochIds:data.expectedEpochIds,
  anchor:data.anchor,anchorKey,trustedAnchorTag:data.trustedAnchorTag,
  trustedObservationCount:2};
 const thirdRegistry={...data.observations[1].registry,revision:12,
  consumedDecisionIds:[...data.observations[1].registry.consumedDecisionIds]};
 const thirdReceipt=createReviewWitnessDecisionRestartReceipt({
  epochId:"epoch-fourth",attemptId:"attempt-87",decisionId:"decision-85",
  registry:thirdRegistry,authorityKey});
 const observations=[...data.observations,{registry:thirdRegistry,receipt:thirdReceipt}];
 const expectedEpochIds=[...data.expectedEpochIds,"epoch-fourth"];
 const anchor=createReviewWitnessDecisionHistoryAnchor({
  ledgerId,decisionId:"decision-85",attemptId:"attempt-87",
  expectedBeforeEpochId:"epoch-before",observations,expectedEpochIds,anchorKey});
 const later={observations,expectedEpochIds,anchor,anchorKey,
  trustedAnchorTag:anchor.authenticationTag,trustedObservationCount:3};
 return {...data,earlier,later};
};
const makeForks=()=>{
 const data=makeAnchorContinuity();
 const first={...data.earlier,anchorId:"anchor-one"};
 const second={...data.later,anchorId:"anchor-two"};
 return {...data,anchors:[first,second],expectedAnchorIds:["anchor-one","anchor-two"]};
};
const auditKey=Buffer.alloc(32,251);
const makeAuthenticated=()=>{
 const data=makeForks();
 const report=inspectReviewWitnessDecisionAnchorAudit(data);
 const authentication=createReviewWitnessDecisionAuditAuthentication({
  report,issuerId:"audit-issuer",reportId:"report-94",auditKey});
 return {...data,report,authentication,auditKey,
  expectedIssuerId:"audit-issuer",expectedReportId:"report-94"};
};
const makeContinuity=()=>{
 const data=makeAuthenticated();
 const first={sequence:100,report:data.report,authentication:data.authentication,
  expectedIssuerId:"audit-issuer",anchors:data.anchors,
  expectedAnchorIds:data.expectedAnchorIds};
 const authentication=createReviewWitnessDecisionAuditAuthentication({
  report:data.report,issuerId:"audit-issuer",reportId:"report-95",auditKey});
 const second={...first,sequence:101,authentication};
 return {...data,records:[first,second],
  expectedReportIds:["report-94","report-95"],
  expectedFirstSequence:100,expectedLastSequence:101};
};
const makeCheckpoints=()=>{
 const data=makeContinuity();
 return {...data,expectedReportDigests:[data.report.reportDigest,data.report.reportDigest]};
};
const inspect=(changes={})=>inspectReviewWitnessDecisionAuditCheckpoints({
 ...makeCheckpoints(),...changes});
const competing=()=>{
 const data=makeForks();
 const thirdRegistry={...data.later.observations[2].registry,
  consumedDecisionIds:["decision-85","other-decision","fork-specific"]};
 const thirdReceipt=createReviewWitnessDecisionRestartReceipt({
  epochId:"epoch-fourth",attemptId:"attempt-87",decisionId:"decision-85",
  registry:thirdRegistry,authorityKey});
 const observations=[...data.later.observations.slice(0,2),
  {registry:thirdRegistry,receipt:thirdReceipt}];
 const anchor=createReviewWitnessDecisionHistoryAnchor({
  ledgerId,decisionId:"decision-85",attemptId:"attempt-87",
  expectedBeforeEpochId:"epoch-before",observations,
  expectedEpochIds:data.later.expectedEpochIds,anchorKey});
 const fork={...data.later,anchorId:"anchor-fork",observations,anchor,
  trustedAnchorTag:anchor.authenticationTag};
 return {...data,anchors:[data.anchors[1],fork],
  expectedAnchorIds:["anchor-two","anchor-fork"]};
};
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 97 — externally trusted audit digest checkpoints",()=>{
 it("accepts verified position-bound digest checkpoints for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_decision_audit_checkpoints_observed_for_manual_review",
   reportCount:2,firstSequence:100,lastSequence:101});
  denied(result);
 });
 it("blocks a substituted digest at the second sequence",()=>{
  const data=makeCheckpoints();
  expect(inspect({...data,expectedReportDigests:[data.report.reportDigest,"0".repeat(64)]}).findings)
   .toContain("AUDIT_CHECKPOINT_DIGEST_MISMATCH");
 });
 it("blocks missing and malformed checkpoints",()=>{
  const data=makeCheckpoints();
  expect(()=>inspect({...data,expectedReportDigests:[data.report.reportDigest]})).toThrow();
  denied(inspect({...data,expectedReportDigests:[data.report.reportDigest,"bad"]}));
 });
 it("blocks tampered authentication before checking digests",()=>{
  const data=makeCheckpoints();
  const records=[data.records[0],{...data.records[1],
   authentication:{...data.records[1].authentication,authenticationTag:"0".repeat(64)}}];
  expect(inspect({...data,records}).findings)
   .toContain("AUDIT_CHECKPOINT_CONTINUITY_UNVERIFIED");
 });
 it("blocks sequence gaps even with valid matching digests",()=>{
  const data=makeCheckpoints();
  const records=[data.records[0],{...data.records[1],sequence:102}];
  expect(inspect({...data,records}).findings)
   .toContain("AUDIT_CHECKPOINT_CONTINUITY_UNVERIFIED");
 });
 it("blocks wrong externally trusted signing key",()=>{
  const data=makeCheckpoints();
  denied(inspect({...data,auditKey:Buffer.alloc(32,7)}));
 });
 it("blocks unsafe getter-based checkpoint values",()=>{
  const data=makeCheckpoints(),digests=[data.report.reportDigest,data.report.reportDigest];
  Object.defineProperty(digests,"1",{get(){throw Error("unsafe");}});
  denied(inspect({...data,expectedReportDigests:digests}));
 });
 it("does not expose keys or original evidence in the result",()=>{
  const result=JSON.stringify(inspect());
  expect(result).not.toContain("authorityKey");
  expect(result).not.toContain("auditKey");
  expect(result).not.toContain("decision-85");
  expect(result).not.toContain("anchor-one");
 });
});
