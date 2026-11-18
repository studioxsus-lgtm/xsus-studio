import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {createReviewWitnessConflictDecision} from "../../next-engines/orchestration/review-witness-conflict-decision.js";
import {inspectReviewWitnessDecisionReplay} from "../../next-engines/orchestration/review-witness-decision-replay.js";
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
const inspect=(changes={})=>inspectReviewWitnessDecisionReplay({...make(),
 trustedRegistry:{ledgerId,revision:9,minimumRevision:5,consumedDecisionIds:[]},
 expectedRegistryRevision:9,expectedMinimumRevision:5,...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 86 — decision replay and freshness preflight",()=>{
 it("observes a fresh authenticated decision without consuming it",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_decision_replay_preflight_observed_for_manual_review",
   decisionId:"decision-85",registryRevision:9,baseRevision:7});denied(result);
 });
 it("blocks an already consumed decision ID",()=>{
  const result=inspect({trustedRegistry:{ledgerId,revision:9,minimumRevision:5,
   consumedDecisionIds:["decision-85"]}});
  expect(result.findings).toContain("DECISION_ALREADY_CONSUMED");denied(result);
 });
 it("blocks a stale base revision",()=>{
  const result=inspect({trustedRegistry:{ledgerId,revision:9,minimumRevision:8,
   consumedDecisionIds:[]},expectedMinimumRevision:8});
  expect(result.findings).toContain("DECISION_REPLAY_STALE_BASE");denied(result);
 });
 it("blocks an unexpected registry revision",()=>{
  denied(inspect({expectedRegistryRevision:10}));
 });
 it("blocks a substituted ledger registry",()=>{
  denied(inspect({trustedRegistry:{ledgerId:"another",revision:9,minimumRevision:5,
   consumedDecisionIds:[]}}));
 });
 it("blocks duplicate consumed IDs and sparse registry arrays",()=>{
  denied(inspect({trustedRegistry:{ledgerId,revision:9,minimumRevision:5,
   consumedDecisionIds:["d-1","d-1"]}}));
  denied(inspect({trustedRegistry:{ledgerId,revision:9,minimumRevision:5,
   consumedDecisionIds:new Array(2)}}));
 });
 it("blocks an altered signed review decision",()=>{
  const data=make();
  data.decision={...data.decision,disposition:"reject_both"};
  denied(inspect(data));
 });
 it("blocks unsafe getters and malformed expected revision",()=>{
  const registry={ledgerId,revision:9,minimumRevision:5,consumedDecisionIds:[]};
  Object.defineProperty(registry,"revision",{get(){throw Error("unsafe");}});
  denied(inspect({trustedRegistry:registry}));
  expect(()=>inspect({expectedRegistryRevision:-1})).toThrow();
 });
});
