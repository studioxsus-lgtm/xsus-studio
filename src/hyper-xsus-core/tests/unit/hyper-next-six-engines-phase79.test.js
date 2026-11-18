import {describe,it,expect} from "vitest";
import {createReviewAdmissionLedgerIntegrityReceipt} from "../../next-engines/orchestration/review-admission-ledger-integrity.js";
import {createReviewWitnessAttestation} from "../../next-engines/orchestration/review-authenticated-witnesses.js";
import {inspectReviewWitnessKeyLifecycle} from "../../next-engines/orchestration/review-witness-key-lifecycle.js";
const ledgerKey=Buffer.alloc(32,161),k1=Buffer.alloc(32,162),k2=Buffer.alloc(32,163);
const ledgerId="ledger-1",challenge="challenge-79";
const make=()=>{
 const ledger={revision:5,minimumSequence:8,registryDigest:"a".repeat(64),
  acceptedCheckpointIds:["cp-7","cp-8"]};
 const receipt=createReviewAdmissionLedgerIntegrityReceipt({ledger,ledgerId,key:ledgerKey});
 const observations=[{witnessId:"w-1",ledger,receipt},{witnessId:"w-2",ledger,receipt}];
 const attestations=observations.map((o,i)=>({
  ...createReviewWitnessAttestation({witnessId:o.witnessId,ledgerId,
   revision:5,challenge,ledgerReceiptTag:receipt.authenticationTag,
   witnessKey:i===0?k1:k2}),keyId:i===0?"key-a":"key-b"}));
 const keyRegistry={"w-1":{"key-a":{key:k1,status:"active",
  validFromRevision:4,validThroughRevision:6}},
  "w-2":{"key-b":{key:k2,status:"active",
  validFromRevision:5,validThroughRevision:7}}};
 return {observations,attestations,keyRegistry};
};
const inspect=(changes={})=>inspectReviewWitnessKeyLifecycle({
 ...make(),ledgerId,ledgerKey,expectedRevision:5,challenge,minimumSequence:8,...changes});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 79 — witness key lifecycle",()=>{
 it("accepts independently keyed active witnesses for manual review",()=>{
  const result=inspect();
  expect(result).toMatchObject({state:"witness_key_lifecycle_observed_for_manual_review",
   witnessCount:2,revision:5});denied(result);
 });
 it("blocks revoked keys even for an earlier signed revision",()=>{
  const data=make();data.keyRegistry["w-1"]["key-a"].status="revoked";
  const result=inspect(data);
  expect(result.findings).toContain("WITNESS_KEY_REVOKED");denied(result);
 });
 it("blocks retired keys without implicit historical fallback",()=>{
  const data=make();data.keyRegistry["w-2"]["key-b"].status="retired";
  expect(inspect(data).findings).toContain("WITNESS_KEY_NOT_ACTIVE");
 });
 it("blocks key validity windows outside the requested revision",()=>{
  const data=make();data.keyRegistry["w-1"]["key-a"].validFromRevision=6;
  expect(inspect(data).findings).toContain("WITNESS_KEY_OUTSIDE_VALIDITY");
 });
 it("blocks key identifier substitution and missing registry entries",()=>{
  const data=make();data.attestations[1].keyId="unknown";
  denied(inspect(data));
  const missing=make();delete missing.keyRegistry["w-2"];
  denied(inspect(missing));
 });
 it("blocks duplicate key identifiers across distinct witnesses",()=>{
  const data=make();data.attestations[1].keyId="key-a";
  expect(inspect(data).findings).toContain("WITNESS_KEY_IDENTITY_INVALID");
 });
 it("blocks invalid key material and forged attestations",()=>{
  const data=make();data.keyRegistry["w-1"]["key-a"].key=Buffer.alloc(2);
  denied(inspect(data));
  const forged=make();forged.attestations[1].authenticationTag="0".repeat(64);
  denied(inspect(forged));
 });
 it("blocks hostile accessors and invalid configuration",()=>{
  const data=make();
  Object.defineProperty(data.keyRegistry["w-1"]["key-a"],"status",
   {get(){throw Error("unsafe");}});
  denied(inspect(data));
  expect(()=>inspect({requiredWitnesses:1})).toThrow();
 });
});
