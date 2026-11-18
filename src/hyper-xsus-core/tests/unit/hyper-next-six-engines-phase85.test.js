import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision,inspectReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
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
const inspect=(data=make())=>inspectReviewWitnessConflictDecision(data);
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 85 — signed external conflict review",()=>{
 it("observes a signed duplicate-proposal review without granting admission",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_conflict_decision_observed_for_manual_review",
   disposition:"escalate"});denied(result);
 });
 it("observes a signed fork escalation without choosing a winner",()=>{
  const result=inspect(make(true));
  expect(result).toMatchObject({state:"witness_conflict_decision_observed_for_manual_review",
   conflictState:"witness_chain_conflict_blocked"});denied(result);
 });
 it("rejects a forged decision signature",()=>{
  const data=make();data.decision={...data.decision,authenticationTag:"0".repeat(64)};
  expect(inspect(data).findings).toContain("CONFLICT_DECISION_AUTHENTICATION_FAILED");
 });
 it("rejects a changed disposition",()=>{
  const data=make();data.decision={...data.decision,disposition:"reject_both"};
  denied(inspect(data));
 });
 it("rejects a substituted reviewer identity or decision identifier",()=>{
  const data=make();data.expectedReviewerId="reviewer-2";
  denied(inspect(data));
  const other=make();other.expectedDecisionId="different";
  denied(inspect(other));
 });
 it("rejects candidate substitution after review",()=>{
  const data=make();data.candidates[1]={...data.candidates[1],trustedHeadTag:"0".repeat(64)};
  denied(inspect(data));
 });
 it("rejects unsafe accessor-based decision records",()=>{
  const data=make();data.decision={...data.decision};
  Object.defineProperty(data.decision,"disposition",{get(){throw Error("unsafe");}});
  denied(inspect(data));
 });
 it("rejects invalid signing configuration and non-review dispositions",()=>{
  expect(()=>createReviewWitnessConflictDecision({
   ledgerId,baseHead:"0".repeat(64),firstHead:"0".repeat(64),
   secondHead:"0".repeat(64),decisionId:"d",reviewerId:"r",
   disposition:"approve_execution",reviewKey})).toThrow();
  expect(()=>inspect({...make(),reviewKey:Buffer.alloc(2)})).toThrow();
 });
});
