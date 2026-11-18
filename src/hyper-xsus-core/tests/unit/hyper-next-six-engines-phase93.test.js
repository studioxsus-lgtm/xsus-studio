import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
import {createReviewWitnessDecisionCasReceipt} from "../../next-engines/orchestration/review-witness-decision-cas-outcome.js";
import {createReviewWitnessDecisionRestartReceipt} from "../../next-engines/orchestration/review-witness-decision-restart-continuity.js";
import {createReviewWitnessDecisionHistoryAnchor} from "../../next-engines/orchestration/review-witness-decision-history-anchor.js";
import {inspectReviewWitnessDecisionAnchorAudit} from "../../next-engines/orchestration/review-witness-decision-anchor-audit.js";
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
const makeContinuity=()=>{
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
 const data=makeContinuity();
 const first={...data.earlier,anchorId:"anchor-one"};
 const second={...data.later,anchorId:"anchor-two"};
 return {...data,anchors:[first,second],expectedAnchorIds:["anchor-one","anchor-two"]};
};
const inspect=(changes={})=>inspectReviewWitnessDecisionAnchorAudit({...makeForks(),...changes});
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
describe("Hyper phase 93 — redacted anchor audit",()=>{
 it("emits deterministic bounded audit of compatible anchors",()=>{
  const a=inspect(),b=inspect();
  expect(a).toMatchObject({state:"witness_decision_anchor_audit_observed_for_manual_review",
   classification:"compatible",anchorCount:2,extensionPairs:1,competingPairs:0});
  expect(a.reportDigest).toBe(b.reportDigest);denied(a);
 });
 it("reports authenticated competing histories for manual review",()=>{
  const result=inspect(competing());
  expect(result).toMatchObject({classification:"competing",competingPairs:1});
  denied(result);
 });
 it("never includes signing keys or raw registry data in the report",()=>{
  const report=JSON.stringify(inspect());
  expect(report).not.toContain("authorityKey");
  expect(report).not.toContain("anchorKey");
  expect(report).not.toContain("consumedDecisionIds");
  expect(report).not.toContain("reviewer-1");
  expect(report).not.toContain("decision-85");
 });
 it("redacts anchor IDs while keeping stable reference digests",()=>{
  const result=inspect();
  expect(result.references).toHaveLength(2);
  expect(result.references.every(x=>/^[a-f0-9]{64}$/.test(x.referenceDigest))).toBe(true);
  expect(JSON.stringify(result)).not.toContain("anchor-one");
 });
 it("blocks a forged trusted anchor",()=>{
  const data=makeForks();data.anchors[1]={...data.anchors[1],trustedAnchorTag:"0".repeat(64)};
  expect(inspect(data).findings).toContain("ANCHOR_AUDIT_EVIDENCE_UNVERIFIED");
 });
 it("blocks a repeated external anchor ID",()=>{
  const data=makeForks();
  denied(inspect({...data,expectedAnchorIds:["anchor-one","anchor-one"]}));
 });
 it("blocks unsafe anchor getters",()=>{
  const data=makeForks(),record={...data.anchors[0]};
  Object.defineProperty(record,"anchor",{get(){throw Error("unsafe");}});
  denied(inspect({...data,anchors:[record,data.anchors[1]]}));
 });
 it("rejects invalid ledger context and oversized candidate sets",()=>{
  expect(()=>inspect({ledgerId:"bad ledger"})).toThrow();
  expect(()=>inspect({anchors:Array(9).fill(makeForks().anchors[0]),
   expectedAnchorIds:Array(9).fill("anchor-one")})).toThrow();
 });
});
