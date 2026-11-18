import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewLedgerWitnessConsensus} from "./review-ledger-witness-consensus.js";

const blocked=code=>Object.freeze({state:"authenticated_witnesses_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe witness record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe witness property");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const mac=(key,witnessId,ledgerId,revision,nonce,tag)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_WITNESS_ATTESTATION_V1",witnessId,ledgerId,revision,nonce,tag]))
 .digest("hex");
/**
 * Phase 78: per-witness HMAC attestation binds witness ID, ledger receipt
 * and caller challenge. Trusted enrollment, independent key custody,
 * challenge uniqueness and expiry MUST be enforced externally.
 * This does not establish real distributed consensus or persist replay state.
 */
export function createReviewWitnessAttestation({
 witnessId,ledgerId,revision,challenge,ledgerReceiptTag,witnessKey
}={}){
 if(!id(witnessId)||!id(ledgerId)||!seq(revision)||!id(challenge)||
  !hex(ledgerReceiptTag)||!keyOk(witnessKey))
  throw new EngineContractError("INVALID_INPUT","Invalid witness attestation configuration");
 return Object.freeze({version:1,witnessId,ledgerId,revision,challenge,
  ledgerReceiptTag,authenticationTag:mac(witnessKey,witnessId,ledgerId,
   revision,challenge,ledgerReceiptTag)});
}
export function inspectReviewAuthenticatedWitnesses({
 observations,attestations,witnessKeys,ledgerId,ledgerKey,expectedRevision,
 challenge,minimumSequence=0,requiredWitnesses=2,maxWitnesses=16
}={}){
 if(!id(ledgerId)||!id(challenge)||!seq(expectedRevision)||
  !seq(minimumSequence)||!keyOk(ledgerKey)||
  !seq(requiredWitnesses)||requiredWitnesses<2||
  !seq(maxWitnesses)||maxWitnesses<requiredWitnesses||maxWitnesses>64||
  !Array.isArray(observations)||!Array.isArray(attestations)||
  observations.length<requiredWitnesses||observations.length>maxWitnesses||
  attestations.length!==observations.length)
  throw new EngineContractError("INVALID_INPUT","Invalid authenticated witness configuration");
 try{
  const seen=new Set(),keys=[];
  for(let i=0;i<observations.length;i++){
   const od=Object.getOwnPropertyDescriptor(observations,String(i));
   const ad=Object.getOwnPropertyDescriptor(attestations,String(i));
   if(!od||!("value" in od)||!ad||!("value" in ad))
    return blocked("WITNESS_ATTESTATION_UNVERIFIED");
   const observation=od.value,attestation=ad.value;
   const witnessId=own(observation,"witnessId");
   if(!id(witnessId)||seen.has(witnessId))
    return blocked("WITNESS_IDENTITY_DUPLICATE_OR_INVALID");
   seen.add(witnessId);
   const witnessKey=own(witnessKeys,witnessId);
   if(!keyOk(witnessKey))return blocked("WITNESS_KEY_UNVERIFIED");
   if(keys.some(k=>k.equals(witnessKey)))
    return blocked("WITNESS_KEYS_NOT_DISTINCT");
   keys.push(witnessKey);
   const tag=own(own(observation,"receipt"),"authenticationTag");
   if(!hex(tag))return blocked("WITNESS_LEDGER_UNVERIFIED");
   const authTag=own(attestation,"authenticationTag");
   if(own(attestation,"version")!==1||
    own(attestation,"witnessId")!==witnessId||
    own(attestation,"ledgerId")!==ledgerId||
    own(attestation,"revision")!==expectedRevision||
    own(attestation,"challenge")!==challenge||
    own(attestation,"ledgerReceiptTag")!==tag||!hex(authTag))
    return blocked("WITNESS_ATTESTATION_CONTEXT_MISMATCH");
   const expected=Buffer.from(mac(witnessKey,witnessId,ledgerId,
    expectedRevision,challenge,tag),"hex");
   if(!timingSafeEqual(expected,Buffer.from(authTag,"hex")))
    return blocked("WITNESS_ATTESTATION_AUTHENTICATION_FAILED");
  }
  const result=inspectReviewLedgerWitnessConsensus({
   observations,ledgerId,key:ledgerKey,expectedRevision,minimumSequence,
   requiredWitnesses,maxWitnesses});
  if(result.state!=="ledger_witness_agreement_observed_for_manual_review")
   return blocked(result.findings?.[0]??"WITNESS_LEDGER_UNVERIFIED");
  return Object.freeze({state:"authenticated_witness_agreement_observed_for_manual_review",
   ledgerId,revision:expectedRevision,witnessCount:seen.size,challenge,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("WITNESS_ATTESTATION_UNVERIFIED");}
}
