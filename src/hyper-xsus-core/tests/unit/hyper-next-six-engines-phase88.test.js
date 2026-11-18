import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
import {createReviewWitnessDecisionCasReceipt} from "../../next-engines/orchestration/review-witness-decision-cas-outcome.js";
import {createReviewWitnessDecisionRestartReceipt,inspectReviewWitnessDecisionRestartContinuity} from "../../next-engines/orchestration/review-witness-decision-restart-continuity.js";
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
const inspect=(changes={})=>inspectReviewWitnessDecisionRestartContinuity({
 ...makeRestart(),...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 88 — CAS restart continuity",()=>{
 it("observes authenticated monotonic post-restart state without authorizing actions",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_decision_restart_continuity_observed_for_manual_review",
   casRevision:10,observedRevision:10});denied(result);
 });
 it("blocks post-restart rollback of the registry revision",()=>{
  const data=makeRestart(),postRestartRegistry={...data.postRestartRegistry,revision:9};
  denied(inspect({...data,postRestartRegistry}));
 });
 it("blocks loss of the consumed decision after restart",()=>{
  const data=makeRestart(),postRestartRegistry={...data.postRestartRegistry,consumedDecisionIds:[]};
  expect(inspect({...data,postRestartRegistry}).findings).toContain("RESTART_REGISTRY_ROLLBACK");
 });
 it("blocks a forged restart receipt signature",()=>{
  const data=makeRestart();
  data.restartReceipt={...data.restartReceipt,authenticationTag:"0".repeat(64)};
  expect(inspect(data).findings).toContain("RESTART_RECEIPT_AUTHENTICATION_FAILED");
 });
 it("blocks substituted epoch IDs",()=>{
  const data=makeRestart();
  data.expectedAfterEpochId="other-epoch";
  expect(inspect(data).findings).toContain("RESTART_RECEIPT_CONTEXT_MISMATCH");
 });
 it("blocks a forged earlier CAS receipt",()=>{
  const data=makeRestart();
  data.receipt={...data.receipt,authenticationTag:"0".repeat(64)};
  expect(inspect(data).findings).toContain("RESTART_CAS_UNVERIFIED");
 });
 it("blocks unsafe getters and duplicate post-restart IDs",()=>{
  const data=makeRestart(),postRestartRegistry={...data.postRestartRegistry};
  Object.defineProperty(postRestartRegistry,"revision",{get(){throw Error("unsafe");}});
  denied(inspect({...data,postRestartRegistry}));
  denied(inspect({postRestartRegistry:{ledgerId,revision:10,minimumRevision:5,
   consumedDecisionIds:["decision-85","decision-85"]}}));
 });
 it("rejects equal epoch IDs and weak signing keys",()=>{
  expect(()=>inspect({expectedBeforeEpochId:"epoch-after"})).toThrow();
  expect(()=>createReviewWitnessDecisionRestartReceipt({
   epochId:"epoch-after",attemptId:"attempt-87",decisionId:"decision-85",
   registry:makeRestart().postRestartRegistry,authorityKey:Buffer.alloc(2)})).toThrow();
 });
});
