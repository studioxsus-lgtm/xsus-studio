import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
import {inspectReviewWitnessChainExtension} from "../../next-engines/orchestration/review-witness-chain-extension.js";
const ledgerId="ledger-1",ledgerKey=Buffer.alloc(32,201),chainKey=Buffer.alloc(32,202);
const round=i=>{
 const revision=5+i,challenge="nonce-"+i;
 const ledger={revision,minimumSequence:8+i,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let j=0;j<2;j++){
  const witnessId="w-"+j,keyId="key-"+i+"-"+j,witnessKey=Buffer.alloc(32,203+i*2+j);
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:witnessKey,status:"active",
   validFromRevision:i===0?4:revision,validThroughRevision:revision}};
 }
 return {challenge,observations,attestations,keyRegistry};
};
const make=()=>{
 const nextRounds=[round(0),round(1),round(2),round(3)];
 const previousRounds=nextRounds.slice(0,3);
 const opts={ledgerId,ledgerKey,chainKey,startingRevision:5,minimumSequence:8};
 const previousChain=createReviewWitnessRotationChain({...opts,rounds:previousRounds});
 const nextChain=createReviewWitnessRotationChain({...opts,rounds:nextRounds});
 return {...opts,previousRounds,previousChain,nextRounds,nextChain,
  trustedPreviousHeadTag:previousChain.headTag,trustedPreviousRoundCount:3,
  trustedNextHeadTag:nextChain.headTag,trustedNextRoundCount:4};
};
const inspect=changes=>inspectReviewWitnessChainExtension({...make(),...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 83 — anchored chain extension",()=>{
 it("observes an authenticated append-only extension",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_chain_extension_observed_for_manual_review",
   previousRoundCount:3,nextRoundCount:4,addedRounds:1});denied(result);
 });
 it("rejects a substituted previous external anchor",()=>{
  denied(inspect({trustedPreviousHeadTag:"0".repeat(64)}));
 });
 it("rejects a substituted next external anchor",()=>{
  denied(inspect({trustedNextHeadTag:"0".repeat(64)}));
 });
 it("rejects a forged historical prefix",()=>{
  const data=make(),links=[...data.nextChain.links];
  links[1]={...links[1],authenticationTag:"0".repeat(64)};
  const result=inspect({...data,nextChain:{...data.nextChain,links}});
  denied(result);
 });
 it("rejects a truncated next chain",()=>{
  const data=make();
  denied(inspect({...data,nextChain:{...data.nextChain,
   links:data.nextChain.links.slice(0,3)}}));
 });
 it("rejects a tampered newly appended round",()=>{
  const data=make();
  data.nextRounds[3].observations[0].ledger={...data.nextRounds[3].observations[0].ledger,
   registryDigest:"b".repeat(64)};
  denied(inspect(data));
 });
 it("rejects hostile getters without triggering execution",()=>{
  const data=make(),changed={...data.nextChain};
  Object.defineProperty(changed,"links",{get(){throw Error("unsafe");}});
  denied(inspect({...data,nextChain:changed}));
 });
 it("rejects non-growing or malformed trusted anchors",()=>{
  expect(()=>inspect({trustedNextRoundCount:3})).toThrow();
  expect(()=>inspect({trustedPreviousHeadTag:"invalid"})).toThrow();
 });
});
