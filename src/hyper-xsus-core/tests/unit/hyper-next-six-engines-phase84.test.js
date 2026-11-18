import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {inspectReviewWitnessChainConflicts} from "../../next-engines/orchestration/review-witness-chain-conflicts.js";
const ledgerId="ledger-1",ledgerKey=Buffer.alloc(32,211),chainKey=Buffer.alloc(32,212);
const round=(i,variant="a")=>{
 const revision=5+i,challenge="nonce-"+i+"-"+variant;
 const ledger={revision,minimumSequence:8+i,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let j=0;j<2;j++){
  const witnessId="w-"+j,keyId="key-"+i+"-"+variant+"-"+j;
  const witnessKey=Buffer.alloc(32,213+i*2+j+(variant==="b"?20:0));
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:witnessKey,status:"active",
   validFromRevision:i===0?4:revision,validThroughRevision:revision}};
 }
 return {challenge,observations,attestations,keyRegistry};
};
const opts={ledgerId,ledgerKey,chainKey,startingRevision:5,minimumSequence:8};
const make=()=>{
 const base=[round(0),round(1),round(2)];
 const previousChain=createReviewWitnessRotationChain({...opts,rounds:base});
 const candidate=rounds=>({
  rounds,chain:createReviewWitnessRotationChain({...opts,rounds}),
  trustedRoundCount:rounds.length,
  get trustedHeadTag(){return this.chain.headTag;}
 });
 const first=candidate([...base,round(3)]);
 const second=candidate([...base,round(3)]);
 return {...opts,previousRounds:base,previousChain,
  trustedPreviousHeadTag:previousChain.headTag,trustedPreviousRoundCount:3,
  candidates:[first,second]};
};
const inspect=changes=>inspectReviewWitnessChainConflicts({...make(),...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 84 — competing chain extensions",()=>{
 it("recognizes duplicate authenticated proposals without admitting either",()=>{
  const result=inspect();
  expect(result.state).toBe("witness_chain_duplicate_proposals_observed_for_manual_review");
  denied(result);
 });
 it("detects a valid independently authenticated fork at the same revision",()=>{
  const data=make(),fork=[...data.previousRounds,round(3,"b")];
  data.candidates[1]={rounds:fork,
   chain:createReviewWitnessRotationChain({...opts,rounds:fork}),
   trustedRoundCount:4};
  data.candidates[1].trustedHeadTag=data.candidates[1].chain.headTag;
  const result=inspect(data);
  expect(result.findings).toContain("CHAIN_COMPETING_FORK_DETECTED");denied(result);
 });
 it("recognizes a longer prefix-compatible candidate without granting execution",()=>{
  const data=make(),extended=[...data.candidates[1].rounds,round(4)];
  const chain=createReviewWitnessRotationChain({...opts,rounds:extended});
  data.candidates[1]={rounds:extended,chain,
   trustedHeadTag:chain.headTag,trustedRoundCount:5};
  const result=inspect(data);
  expect(result).toMatchObject({state:"witness_chain_prefix_compatible_proposals_observed_for_manual_review",
   shorterRoundCount:4,longerRoundCount:5});denied(result);
 });
 it("blocks a forged candidate anchor",()=>{
  const data=make();data.candidates[1]={...data.candidates[1],
   trustedHeadTag:"0".repeat(64)};
  denied(inspect(data));
 });
 it("blocks tampered chain links",()=>{
  const data=make(),c=data.candidates[0],links=[...c.chain.links];
  links[3]={...links[3],authenticationTag:"0".repeat(64)};
  data.candidates[0]={...c,chain:{...c.chain,links}};
  denied(inspect(data));
 });
 it("blocks a candidate with modified shared history",()=>{
  const data=make(),fork=[round(0,"b"),round(1,"b"),round(2,"b"),round(3,"b")];
  const chain=createReviewWitnessRotationChain({...opts,rounds:fork});
  data.candidates[1]={rounds:fork,chain,trustedHeadTag:chain.headTag,trustedRoundCount:4};
  denied(inspect(data));
 });
 it("blocks sparse and accessor-based candidate data",()=>{
  const data=make();data.candidates[1]=undefined;
  denied(inspect(data));
  const hostile=make();
  Object.defineProperty(hostile.candidates[1],"chain",{get(){throw Error("unsafe");}});
  denied(inspect(hostile));
 });
 it("rejects malformed candidate count and anchor",()=>{
  expect(()=>inspect({candidates:[]})).toThrow();
  expect(()=>inspect({trustedPreviousHeadTag:"invalid"})).toThrow();
 });
});
