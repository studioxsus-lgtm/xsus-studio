import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {inspectReviewWitnessKeyRotationHistory} from "../../next-engines/orchestration/review-witness-key-rotation-history.js";
const ledgerKey=Buffer.alloc(32,181),ledgerId="ledger-1";
const key=(i,j)=>Buffer.alloc(32,182+i*2+j);
const makeRound=i=>{
 const revision=5+i,challenge="nonce-"+i;
 const ledger={revision,minimumSequence:8+i,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let j=0;j<2;j++){
  const witnessId="w-"+(j+1),keyId="key-"+i+"-"+j,witnessKey=key(i,j);
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:witnessKey,status:"active",
   validFromRevision:i===0?4:revision,
   validThroughRevision:i===2?revision+1:revision}};
 }
 return {challenge,observations,attestations,keyRegistry};
};
const rounds=()=>[makeRound(0),makeRound(1),makeRound(2)];
const inspect=(options={})=>inspectReviewWitnessKeyRotationHistory({
 rounds:rounds(),ledgerId,ledgerKey,startingRevision:5,minimumSequence:8,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 81 — multi-round key rotation history",()=>{
 it("observes three consecutive authenticated rotations for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_key_rotation_history_observed_for_manual_review",
   startingRevision:5,endingRevision:7,roundCount:3,witnessCount:2});denied(result);
 });
 it("blocks reuse of a historical key ID",()=>{
  const data=rounds(),old=data[0].attestations[0].keyId;
  const current=data[2].attestations[0].keyId;
  data[2].attestations[0].keyId=old;
  data[2].keyRegistry["w-1"][old]=data[2].keyRegistry["w-1"][current];
  const result=inspect({rounds:data});
  expect(result.findings).toContain("ROTATION_HISTORY_KEY_REUSED");denied(result);
 });
 it("blocks reuse of historical key material under a new ID",()=>{
  const data=rounds(),record=data[2].keyRegistry["w-1"]["key-2-0"];
  record.key=key(0,0);
  const result=inspect({rounds:data});
  expect(result.findings).toContain("ROTATION_HISTORY_KEY_REUSED");denied(result);
 });
 it("blocks a replayed challenge across nonadjacent rounds",()=>{
  const data=rounds();data[2].challenge=data[0].challenge;
  expect(inspect({rounds:data}).findings).toContain("ROTATION_HISTORY_CHALLENGE_REPLAY");
 });
 it("blocks a sequence rollback",()=>{
  const data=rounds();
  const ledger={...data[2].observations[0].ledger,minimumSequence:8};
  const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
  for(let j=0;j<2;j++){
   data[2].observations[j]={...data[2].observations[j],ledger,receipt};
   data[2].attestations[j]={...data[2].attestations[j],
    ledgerReceiptTag:receipt.authenticationTag};
  }
  denied(inspect({rounds:data}));
 });
 it("blocks a revoked intermediate rotation key",()=>{
  const data=rounds();data[1].keyRegistry["w-2"]["key-1-1"].status="revoked";
  denied(inspect({rounds:data}));
 });
 it("blocks a missing intermediate round and sparse history",()=>{
  expect(()=>inspect({rounds:rounds().slice(0,2)})).toThrow();
  denied(inspect({rounds:new Array(3)}));
 });
 it("blocks hostile getters and invalid limits",()=>{
  const data=rounds();
  Object.defineProperty(data[1],"challenge",{get(){throw Error("unsafe");}});
  denied(inspect({rounds:data}));
  expect(()=>inspect({maxRounds:2})).toThrow();
 });
});
