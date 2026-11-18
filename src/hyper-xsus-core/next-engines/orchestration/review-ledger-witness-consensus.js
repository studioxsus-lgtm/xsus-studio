import {EngineContractError} from "../contracts.js";
import {inspectReviewAdmissionLedgerIntegrity} from "./review-admission-ledger-integrity.js";

const blocked=code=>Object.freeze({state:"ledger_witness_consensus_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe witness");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe witness field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
/**
 * Phase 77: read-only cross-witness comparison of authenticated snapshots
 * at the SAME revision. Every witness identity must be supplied by a
 * separately trusted source; witnessId is not cryptographically attested.
 * Shared HMAC keys and caller-supplied observations do not prove witness
 * independence, availability, global consensus, or absence of hidden forks.
 */
export function inspectReviewLedgerWitnessConsensus({
 observations,ledgerId,key,expectedRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxAcceptedIds=10000
}={}){
 if(!id(ledgerId)||!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !seq(expectedRevision)||!seq(minimumSequence)||
  !seq(requiredWitnesses)||requiredWitnesses<2||
  !seq(maxWitnesses)||maxWitnesses<requiredWitnesses||maxWitnesses>64||
  !seq(maxAcceptedIds)||maxAcceptedIds<1||maxAcceptedIds>10000||
  !Array.isArray(observations)||observations.length<requiredWitnesses||
  observations.length>maxWitnesses)
  throw new EngineContractError("INVALID_INPUT","Invalid witness consensus configuration");
 try{
  const witnessIds=new Set();
  let expectedTag,expectedDigest,expectedFloor;
  for(let i=0;i<observations.length;i++){
   const d=Object.getOwnPropertyDescriptor(observations,String(i));
   if(!d||!("value" in d))return blocked("WITNESS_OBSERVATION_UNVERIFIED");
   const observation=d.value;
   const witnessId=own(observation,"witnessId");
   if(!id(witnessId)||witnessIds.has(witnessId))
    return blocked("WITNESS_IDENTITY_DUPLICATE_OR_INVALID");
   witnessIds.add(witnessId);
   const ledger=own(observation,"ledger"),receipt=own(observation,"receipt");
   const result=inspectReviewAdmissionLedgerIntegrity({
    ledger,ledgerId,receipt,key,minimumRevision:expectedRevision,
    minimumSequence,maxAcceptedIds});
   if(result.state!=="admission_ledger_integrity_observed_for_manual_review")
    return blocked("WITNESS_LEDGER_UNVERIFIED");
   if(result.revision!==expectedRevision)
    return blocked("WITNESS_REVISION_MISMATCH");
   const tag=own(receipt,"authenticationTag");
   const digest=own(ledger,"registryDigest");
   if(!hex(tag)||!hex(digest))return blocked("WITNESS_LEDGER_UNVERIFIED");
   if(i===0){expectedTag=tag;expectedDigest=digest;expectedFloor=result.minimumSequence;}
   else if(tag!==expectedTag||digest!==expectedDigest||
    result.minimumSequence!==expectedFloor)
    return blocked("WITNESS_LEDGER_FORK_DETECTED");
  }
  return Object.freeze({state:"ledger_witness_agreement_observed_for_manual_review",
   ledgerId,revision:expectedRevision,minimumSequence:expectedFloor,
   witnessCount:witnessIds.size,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("WITNESS_OBSERVATION_UNVERIFIED");}
}
