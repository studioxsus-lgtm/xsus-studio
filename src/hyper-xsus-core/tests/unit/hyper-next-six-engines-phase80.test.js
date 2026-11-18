import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {inspectReviewWitnessKeyRotationContinuity} from "../../next-engines/orchestration/review-witness-key-rotation-continuity.js";
const ledgerKey=Buffer.alloc(32,171),oldKeys=[Buffer.alloc(32,172),Buffer.alloc(32,173)];
const newKeys=[Buffer.alloc(32,174),Buffer.alloc(32,175)],ledgerId="ledger-1";
const round=(revision,keys,prefix,challenge)=>{
 const ledger={revision,minimumSequence:revision+3,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[],attestations=[],keyRegistry={};
 for(let i=0;i<2;i++){
  const witnessId="w-"+(i+1),keyId=prefix+"-"+(i+1);
  observations.push({witnessId,ledger,receipt});
  attestations.push({...createReviewWitnessAttestation({witnessId,ledgerId,revision,
   challenge,ledgerReceiptTag:receipt.authenticationTag,witnessKey:keys[i]}),keyId});
  keyRegistry[witnessId]={[keyId]:{key:keys[i],status:"active",
   validFromRevision:prefix==="old"?4:6,
   validThroughRevision:prefix==="old"?5:7}};
 }
 return {observations,attestations,keyRegistry,challenge};
};
const pair=()=>({before:round(5,oldKeys,"old","nonce-before"),
 after:round(6,newKeys,"new","nonce-after")});
const inspect=(options={})=>inspectReviewWitnessKeyRotationContinuity({
 ...pair(),ledgerId,ledgerKey,beforeRevision:5,afterRevision:6,minimumSequence:8,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 80 — witness key rotation continuity",()=>{
 it("observes consecutive authenticated key rotation for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_key_rotation_continuity_observed_for_manual_review",
   beforeRevision:5,afterRevision:6,witnessCount:2});denied(result);
 });
 it("blocks reused challenge",()=>{
  const data=pair();data.after.challenge=data.before.challenge;
  expect(inspect(data).findings).toContain("ROTATION_CHALLENGE_REPLAY");
 });
 it("blocks old keys with an open-ended validity window",()=>{
  const data=pair();data.before.keyRegistry["w-1"]["old-1"].validThroughRevision=6;
  expect(inspect(data).findings).toContain("ROTATION_OLD_KEY_NOT_CLOSED");
 });
 it("blocks new keys starting at the wrong revision",()=>{
  const data=pair();data.after.keyRegistry["w-2"]["new-2"].validFromRevision=5;
  expect(inspect(data).findings).toContain("ROTATION_NEW_KEY_WINDOW_INVALID");
 });
 it("blocks a key reused under a new key identifier",()=>{
  const data=pair();data.after.keyRegistry["w-1"]["new-1"].key=oldKeys[0];
  data.after.attestations[0]={...createReviewWitnessAttestation({
   witnessId:"w-1",ledgerId,revision:6,challenge:"nonce-after",
   ledgerReceiptTag:data.after.observations[0].receipt.authenticationTag,
   witnessKey:oldKeys[0]}),keyId:"new-1"};
  expect(inspect(data).findings).toContain("ROTATION_KEY_NOT_CHANGED");
 });
 it("blocks forged attestations and changed witness identities",()=>{
  const forged=pair();forged.after.attestations[1].authenticationTag="0".repeat(64);
  denied(inspect(forged));
  const changed=pair();changed.after.observations[1].witnessId="w-3";
  denied(inspect(changed));
 });
 it("blocks revoked keys during either authenticated round",()=>{
  const data=pair();data.after.keyRegistry["w-2"]["new-2"].status="revoked";
  denied(inspect(data));
 });
 it("blocks hostile accessors and invalid revision transitions",()=>{
  const data=pair();
  Object.defineProperty(data.before,"challenge",{get(){throw Error("unsafe");}});
  denied(inspect(data));
  expect(()=>inspect({afterRevision:7})).toThrow();
 });
});
