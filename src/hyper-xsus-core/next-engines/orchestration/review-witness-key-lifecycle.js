import {EngineContractError} from "../contracts.js";
import {inspectReviewAuthenticatedWitnesses} from "./review-authenticated-witnesses.js";

const blocked=code=>Object.freeze({state:"witness_key_lifecycle_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe key registry");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe key field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
/**
 * Phase 79: read-only policy check for a trusted, externally versioned key
 * registry. Key IDs are assigned by the caller; a key is active only within
 * [validFromRevision, validThroughRevision]. Revocation is absolute here:
 * historical verification of revoked keys requires a separate trusted audit
 * process, never implicit fallback. This does not rotate, persist or revoke
 * any real key, nor authenticate registry provenance.
 */
export function inspectReviewWitnessKeyLifecycle({
 observations,attestations,keyRegistry,ledgerId,ledgerKey,
 expectedRevision,challenge,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16
}={}){
 if(!id(ledgerId)||!id(challenge)||!seq(expectedRevision)||
  !seq(minimumSequence)||!keyOk(ledgerKey)||
  !seq(requiredWitnesses)||requiredWitnesses<2||
  !seq(maxWitnesses)||maxWitnesses<requiredWitnesses||maxWitnesses>64||
  !Array.isArray(observations)||!Array.isArray(attestations)||
  observations.length<requiredWitnesses||observations.length>maxWitnesses||
  observations.length!==attestations.length)
  throw new EngineContractError("INVALID_INPUT","Invalid witness key lifecycle configuration");
 try{
  const keys=Object.create(null),seenWitnesses=new Set(),seenKeyIds=new Set();
  for(let i=0;i<observations.length;i++){
   const od=Object.getOwnPropertyDescriptor(observations,String(i));
   const ad=Object.getOwnPropertyDescriptor(attestations,String(i));
   if(!od||!("value" in od)||!ad||!("value" in ad))
    return blocked("WITNESS_KEY_RECORD_UNVERIFIED");
   const witnessId=own(od.value,"witnessId");
   const att=ad.value,keyId=own(att,"keyId");
   if(!id(witnessId)||seenWitnesses.has(witnessId)||
    !id(keyId)||seenKeyIds.has(keyId))
    return blocked("WITNESS_KEY_IDENTITY_INVALID");
   seenWitnesses.add(witnessId);seenKeyIds.add(keyId);
   const entry=own(keyRegistry,witnessId);
   const selected=own(entry,keyId);
   const key=own(selected,"key");
   const status=own(selected,"status");
   const from=own(selected,"validFromRevision");
   const through=own(selected,"validThroughRevision");
   if(!keyOk(key)||!seq(from)||!seq(through)||through<from)
    return blocked("WITNESS_KEY_POLICY_UNVERIFIED");
   if(status==="revoked")return blocked("WITNESS_KEY_REVOKED");
   if(status!=="active")return blocked("WITNESS_KEY_NOT_ACTIVE");
   if(expectedRevision<from||expectedRevision>through)
    return blocked("WITNESS_KEY_OUTSIDE_VALIDITY");
   keys[witnessId]=key;
  }
  const result=inspectReviewAuthenticatedWitnesses({
   observations,attestations,witnessKeys:keys,ledgerId,ledgerKey,
   expectedRevision,challenge,minimumSequence,requiredWitnesses,maxWitnesses});
  if(result.state!=="authenticated_witness_agreement_observed_for_manual_review")
   return blocked(result.findings?.[0]??"WITNESS_AUTHENTICATION_UNVERIFIED");
  return Object.freeze({state:"witness_key_lifecycle_observed_for_manual_review",
   ledgerId,revision:expectedRevision,witnessCount:seenWitnesses.size,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("WITNESS_KEY_RECORD_UNVERIFIED");}
}
