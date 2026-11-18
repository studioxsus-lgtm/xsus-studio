import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
import {createReviewWitnessDecisionCasReceipt} from "../../next-engines/orchestration/review-witness-decision-cas-outcome.js";
import {createReviewWitnessDecisionRestartReceipt} from "../../next-engines/orchestration/review-witness-decision-restart-continuity.js";
import {inspectReviewWitnessDecisionRestartHistory} from "../../next-engines/orchestration/review-witness-decision-restart-history.js";
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
const inspect=(changes={})=>inspectReviewWitnessDecisionRestartHistory({
 ...makeHistory(),...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 89 — multi-epoch restart history",()=>{
 it("observes two authenticated epochs without authorizing actions",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_decision_restart_history_observed_for_manual_review",
   observationCount:2,lastRevision:11});denied(result);
 });
 it("blocks a later revision rollback despite a valid signature",()=>{
  const data=makeHistory(),registry={...data.observations[1].registry,revision:9};
  const receipt=createReviewWitnessDecisionRestartReceipt({
   epochId:"epoch-third",attemptId:"attempt-87",decisionId:"decision-85",
   registry,authorityKey});
  const result=inspect({...data,observations:[data.observations[0],{registry,receipt}]});
  expect(result.findings).toContain("RESTART_HISTORY_ROLLBACK");denied(result);
 });
 it("blocks disappearance of a previously consumed decision ID",()=>{
  const data=makeHistory(),registry={...data.observations[1].registry,
   consumedDecisionIds:["other-decision"]};
  const receipt=createReviewWitnessDecisionRestartReceipt({
   epochId:"epoch-third",attemptId:"attempt-87",decisionId:"decision-85",
   registry,authorityKey});
  denied(inspect({...data,observations:[data.observations[0],{registry,receipt}]}));
 });
 it("blocks replayed epoch identifiers",()=>{
  const data=makeHistory();
  expect(inspect({...data,expectedEpochIds:["epoch-after","epoch-after"]}).findings)
   .toContain("RESTART_HISTORY_EPOCH_REPLAY");
 });
 it("blocks a forged later receipt",()=>{
  const data=makeHistory();data.observations[1]={...data.observations[1],
   receipt:{...data.observations[1].receipt,authenticationTag:"0".repeat(64)}};
  expect(inspect(data).findings).toContain("RESTART_HISTORY_RECEIPT_UNVERIFIED");
 });
 it("blocks a forged initial CAS claim",()=>{
  const data=makeHistory();data.receipt={...data.receipt,authenticationTag:"0".repeat(64)};
  expect(inspect(data).findings).toContain("RESTART_HISTORY_INITIAL_UNVERIFIED");
 });
 it("blocks unsafe getters and sparse observation arrays",()=>{
  const data=makeHistory(),record={...data.observations[1]};
  Object.defineProperty(record,"registry",{get(){throw Error("unsafe");}});
  denied(inspect({...data,observations:[data.observations[0],record]}));
  denied(inspect({...data,observations:[data.observations[0],,]}));
 });
 it("rejects unbounded or mismatched history configuration",()=>{
  expect(()=>inspect({maxObservations:1})).toThrow();
  expect(()=>inspect({expectedEpochIds:["epoch-after"]})).toThrow();
 });
});
