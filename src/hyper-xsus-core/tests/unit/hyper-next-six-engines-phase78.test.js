import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation,inspectReviewAuthenticatedWitnesses} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
const ledgerKey=Buffer.alloc(32,151),w1=Buffer.alloc(32,152),w2=Buffer.alloc(32,153);
const ledgerId="ledger-1",challenge="nonce-123",expectedRevision=5;
const observations=()=>{
 const ledger={revision:5,minimumSequence:8,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 return [{witnessId:"w-1",ledger,receipt},{witnessId:"w-2",ledger,receipt}];
};
const attestations=obs=>obs.map(o=>createReviewWitnessAttestation({
 witnessId:o.witnessId,ledgerId,revision:5,challenge,
 ledgerReceiptTag:o.receipt.authenticationTag,witnessKey:o.witnessId==="w-1"?w1:w2}));
const inspect=(options={})=>{
 const obs=observations();
 return inspectReviewAuthenticatedWitnesses({observations:obs,attestations:attestations(obs),
  witnessKeys:{"w-1":w1,"w-2":w2},ledgerId,ledgerKey,
  expectedRevision,challenge,minimumSequence:8,...options});
};
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 78 — challenge-bound witness authentication",()=>{
 it("observes distinct authenticated witnesses for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"authenticated_witness_agreement_observed_for_manual_review",
   witnessCount:2,revision:5,challenge});denied(result);
 });
 it("blocks a substituted witness identity",()=>{
  const obs=observations();obs[1]={...obs[1],witnessId:"w-3"};
  denied(inspect({observations:obs}));
 });
 it("blocks replay under a different challenge",()=>{
  const result=inspect({challenge:"nonce-456"});
  expect(result.findings).toContain("WITNESS_ATTESTATION_CONTEXT_MISMATCH");denied(result);
 });
 it("blocks a forged witness signature",()=>{
  const obs=observations(),atts=attestations(obs);
  atts[1]={...atts[1],authenticationTag:"0".repeat(64)};
  const result=inspect({attestations:atts});
  expect(result.findings).toContain("WITNESS_ATTESTATION_AUTHENTICATION_FAILED");denied(result);
 });
 it("blocks reused witness keys masquerading as independent witnesses",()=>{
  const result=inspect({witnessKeys:{"w-1":w1,"w-2":w1}});
  expect(result.findings).toContain("WITNESS_KEYS_NOT_DISTINCT");denied(result);
 });
 it("blocks an authenticated ledger fork between witnesses",()=>{
  const obs=observations();
  const changed={...obs[1].ledger,acceptedCheckpointIds:["cp-7","cp-9"]};
  obs[1]={...obs[1],ledger:changed,
   receipt:createReviewAdmissionLedgerIntegrityReceipt({ledger:changed,ledgerId,key:ledgerKey})};
  const result=inspect({observations:obs,attestations:attestations(obs)});
  expect(result.findings).toContain("WITNESS_LEDGER_FORK_DETECTED");denied(result);
 });
 it("blocks missing keys and malformed attestations",()=>{
  denied(inspect({witnessKeys:{"w-1":w1}}));
  const obs=observations(),atts=attestations(obs);
  Object.defineProperty(atts[1],"authenticationTag",{get(){throw Error("unsafe");}});
  denied(inspect({attestations:atts}));
 });
 it("rejects insufficient witness evidence and invalid inputs",()=>{
  expect(()=>inspect({attestations:[]})).toThrow();
  expect(()=>inspect({requiredWitnesses:1})).toThrow();
  expect(()=>createReviewWitnessAttestation({
   witnessId:"w-1",ledgerId,revision:5,challenge,
   ledgerReceiptTag:"0".repeat(64),witnessKey:Buffer.alloc(2)})).toThrow();
 });
});
