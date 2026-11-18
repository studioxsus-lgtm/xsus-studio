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
import {createReviewWitnessDecisionAuditCheckpointManifest} from "../../next-engines/orchestration/review-witness-decision-audit-checkpoint-manifest.js";
import {inspectReviewWitnessDecisionAuditManifestContinuity} from "../../next-engines/orchestration/review-witness-decision-audit-manifest-continuity.js";
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
const manifestKey=Buffer.alloc(32,19);
const makeManifest=()=>{
 const data=makeCheckpoints();
 const manifest=createReviewWitnessDecisionAuditCheckpointManifest({
  ...data,manifestId:"manifest-98",manifestKey});
 return {...data,manifest,manifestKey,expectedManifestId:"manifest-98",
  trustedManifestTag:manifest.authenticationTag};
};
const entry=(data)=>({
 context:{
  ...data,manifest:undefined,manifestKey:undefined,
  expectedManifestId:undefined,trustedManifestTag:undefined
 },
 manifest:data.manifest,manifestKey:data.manifestKey,
 expectedManifestId:data.expectedManifestId,trustedManifestTag:data.trustedManifestTag
});
const makePair=()=>{
 const first=makeManifest();
 const secondData=makeCheckpoints();
 const ids=["report-99-a","report-99-b"];
 const records=secondData.records.map((r,i)=>({
  ...r,sequence:102+i,authentication:createReviewWitnessDecisionAuditAuthentication({
   report:r.report,issuerId:"audit-issuer",reportId:ids[i],auditKey})
 }));
 const secondContext={...secondData,records,expectedReportIds:ids,
  expectedFirstSequence:102,expectedLastSequence:103};
 const manifest=createReviewWitnessDecisionAuditCheckpointManifest({
  ...secondContext,manifestId:"manifest-99",manifestKey});
 const second={...secondContext,manifest,manifestKey,
  expectedManifestId:"manifest-99",trustedManifestTag:manifest.authenticationTag};
 return {earlier:entry(first),later:entry(second),
  expectedIssuerId:"audit-issuer",expectedFirstSequence:100,expectedLastSequence:103};
};
const inspect=(changes={})=>inspectReviewWitnessDecisionAuditManifestContinuity({
 ...makePair(),...changes});
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
describe("Hyper phase 99 — adjacent authenticated manifest continuity",()=>{
 it("verifies adjacent authenticated manifests without authorizing action",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_decision_manifest_continuity_observed_for_manual_review",
   manifestCount:2,reportCount:4,firstSequence:100,lastSequence:103});
  denied(result);
 });
 it("rejects gaps between manifests",()=>{
  const data=makePair(),later={...data.later,
   context:{...data.later.context,expectedFirstSequence:104,expectedLastSequence:105}};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_SEQUENCE_MISMATCH");
 });
 it("rejects overlapping ranges",()=>{
  const data=makePair(),later={...data.later,
   context:{...data.later.context,expectedFirstSequence:101,expectedLastSequence:102}};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_SEQUENCE_MISMATCH");
 });
 it("rejects repeated manifest IDs",()=>{
  const data=makePair(),later={...data.later,expectedManifestId:data.earlier.expectedManifestId};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_REPLAY");
 });
 it("rejects an untrusted issuer in the second manifest",()=>{
  const data=makePair(),later={...data.later,
   context:{...data.later.context,expectedIssuerId:"attacker"}};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_ISSUER_MISMATCH");
 });
 it("rejects altered independently trusted tag",()=>{
  const data=makePair(),later={...data.later,trustedManifestTag:"0".repeat(64)};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_AUTHENTICATION_UNVERIFIED");
 });
 it("rejects tampered evidence in later manifest",()=>{
  const data=makePair(),context=data.later.context;
  const records=[context.records[0],{...context.records[1],
   authentication:{...context.records[1].authentication,authenticationTag:"0".repeat(64)}}];
  const later={...data.later,context:{...context,records}};
  expect(inspect({...data,later}).findings)
   .toContain("AUDIT_MANIFEST_CONTINUITY_AUTHENTICATION_UNVERIFIED");
 });
 it("rejects untrusted range bounds and unsafe getters",()=>{
  expect(()=>inspect({expectedLastSequence:99})).toThrow();
  const data=makePair(),later={...data.later};
  Object.defineProperty(later,"manifest",{get(){throw Error("unsafe");}});
  denied(inspect({...data,later}));
 });
});
