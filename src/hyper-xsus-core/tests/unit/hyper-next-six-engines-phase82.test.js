import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {createReviewWitnessRotationChain,inspectReviewWitnessRotationChain} from "../../next-engines/orchestration/review-witness-rotation-chain.js";
const ledgerKey=Buffer.alloc(32,191),chainKey=Buffer.alloc(32,192),ledgerId="ledger-1";
const round=i=>{
 const revision=5+i,challenge="nonce-"+i;
 const ledger={revision,minimumSequence:8+i,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let j=0;j<2;j++){
  const witnessId="w-"+j,keyId="key-"+i+"-"+j,witnessKey=Buffer.alloc(32,193+i*2+j);
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:witnessKey,status:"active",
   validFromRevision:i===0?4:revision,
   validThroughRevision:i===2?revision+1:revision}};
 }
 return {challenge,observations,attestations,keyRegistry};
};
const make=()=>{
 const rounds=[round(0),round(1),round(2)];
 const chain=createReviewWitnessRotationChain({rounds,ledgerId,ledgerKey,chainKey,
  startingRevision:5,minimumSequence:8});
 return {rounds,chain,trustedHeadTag:chain.headTag,trustedRoundCount:3,
  ledgerId,ledgerKey,chainKey,startingRevision:5,minimumSequence:8};
};
const inspect=(changes={})=>inspectReviewWitnessRotationChain({...make(),...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 82 — anchored authenticated rotation chain",()=>{
 it("observes a complete authenticated chain for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_rotation_chain_observed_for_manual_review",
   roundCount:3,startingRevision:5});denied(result);
 });
 it("blocks a tampered intermediate link",()=>{
  const data=make(),links=[...data.chain.links];
  links[1]={...links[1],authenticationTag:"0".repeat(64)};
  const result=inspect({...data,chain:{...data.chain,links}});
  expect(result.findings).toContain("ROTATION_CHAIN_LINK_TAMPERED");denied(result);
 });
 it("blocks a substituted external head anchor",()=>{
  const data=make();
  expect(inspect({...data,trustedHeadTag:"0".repeat(64)}).findings)
   .toContain("ROTATION_CHAIN_ANCHOR_MISMATCH");
 });
 it("blocks an altered chain head",()=>{
  const data=make();
  denied(inspect({...data,chain:{...data.chain,headTag:"0".repeat(64)}}));
 });
 it("blocks a truncated chain against a trusted count",()=>{
  const data=make();
  denied(inspect({...data,chain:{...data.chain,links:data.chain.links.slice(0,2)}}));
  denied(inspect({...data,trustedRoundCount:2}));
 });
 it("blocks a forged ledger observation",()=>{
  const data=make();
  data.rounds[1].observations[0].ledger={...data.rounds[1].observations[0].ledger,
   registryDigest:"b".repeat(64)};
  denied(inspect(data));
 });
 it("blocks sparse or accessor-based chain links",()=>{
  const data=make(),links=[...data.chain.links];
  links[1]=undefined;
  denied(inspect({...data,chain:{...data.chain,links}}));
  const other=make(),altered={...other.chain};
  Object.defineProperty(altered,"headTag",{get(){throw Error("unsafe");}});
  denied(inspect({...other,chain:altered}));
 });
 it("rejects invalid anchor configuration and unverified histories",()=>{
  expect(()=>inspect({trustedHeadTag:"bad"})).toThrow();
  const data=make();data.rounds[1].challenge=data.rounds[0].challenge;
  expect(()=>createReviewWitnessRotationChain(data)).toThrow();
 });
});
