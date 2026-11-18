import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessKeyLifecycle} from "./review-witness-key-lifecycle.js";

const blocked=code=>Object.freeze({state:"witness_key_rotation_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe transition");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
/**
 * Phase 80: read-only verification of two authenticated witness rounds
 * around a caller-asserted key rotation. Requires distinct challenges,
 * consecutive revisions and exactly the same enrolled witnesses. The old
 * keys must end at the before revision; new keys must begin at the after
 * revision. Key registry provenance, actual revocation and freshness must
 * be enforced by an independent trusted provider.
 */
export function inspectReviewWitnessKeyRotationContinuity({
 before,after,ledgerId,ledgerKey,beforeRevision,afterRevision,
 minimumSequence=0,requiredWitnesses=2,maxWitnesses=16
}={}){
 if(!id(ledgerId)||!keyOk(ledgerKey)||!seq(beforeRevision)||
  beforeRevision===Number.MAX_SAFE_INTEGER||afterRevision!==beforeRevision+1||
  !seq(minimumSequence)||!seq(requiredWitnesses)||requiredWitnesses<2||
  !seq(maxWitnesses)||maxWitnesses<requiredWitnesses||maxWitnesses>64)
  throw new EngineContractError("INVALID_INPUT","Invalid witness rotation configuration");
 try{
  const beforeChallenge=own(before,"challenge"),afterChallenge=own(after,"challenge");
  if(!id(beforeChallenge)||!id(afterChallenge)||beforeChallenge===afterChallenge)
   return blocked("ROTATION_CHALLENGE_REPLAY");
  const bObs=own(before,"observations"),aObs=own(after,"observations");
  const bAtt=own(before,"attestations"),aAtt=own(after,"attestations");
  const bRegistry=own(before,"keyRegistry"),aRegistry=own(after,"keyRegistry");
  if(!Array.isArray(bObs)||!Array.isArray(aObs)||!Array.isArray(bAtt)||
   !Array.isArray(aAtt)||bObs.length!==aObs.length||
   bObs.length<requiredWitnesses||bObs.length>maxWitnesses)
   return blocked("ROTATION_WITNESS_SET_CHANGED");
  const b=inspectReviewWitnessKeyLifecycle({observations:bObs,
   attestations:bAtt,keyRegistry:bRegistry,ledgerId,ledgerKey,
   expectedRevision:beforeRevision,challenge:beforeChallenge,
   minimumSequence,requiredWitnesses,maxWitnesses});
  const a=inspectReviewWitnessKeyLifecycle({observations:aObs,
   attestations:aAtt,keyRegistry:aRegistry,ledgerId,ledgerKey,
   expectedRevision:afterRevision,challenge:afterChallenge,
   minimumSequence,requiredWitnesses,maxWitnesses});
  if(b.state!=="witness_key_lifecycle_observed_for_manual_review"||
   a.state!=="witness_key_lifecycle_observed_for_manual_review")
   return blocked("ROTATION_AUTHENTICATION_UNVERIFIED");
  const previous=new Map();
  for(let i=0;i<bObs.length;i++){
   const od=Object.getOwnPropertyDescriptor(bObs,String(i));
   const ad=Object.getOwnPropertyDescriptor(bAtt,String(i));
   if(!od||!("value" in od)||!ad||!("value" in ad))
    return blocked("ROTATION_WITNESS_SET_CHANGED");
   const witnessId=own(od.value,"witnessId"),keyId=own(ad.value,"keyId");
   const keyRecord=own(own(bRegistry,witnessId),keyId);
   if(own(keyRecord,"validThroughRevision")!==beforeRevision)
    return blocked("ROTATION_OLD_KEY_NOT_CLOSED");
   previous.set(witnessId,{keyId,key:own(keyRecord,"key")});
  }
  for(let i=0;i<aObs.length;i++){
   const od=Object.getOwnPropertyDescriptor(aObs,String(i));
   const ad=Object.getOwnPropertyDescriptor(aAtt,String(i));
   if(!od||!("value" in od)||!ad||!("value" in ad))
    return blocked("ROTATION_WITNESS_SET_CHANGED");
   const witnessId=own(od.value,"witnessId"),keyId=own(ad.value,"keyId");
   const old=previous.get(witnessId);
   if(!old)return blocked("ROTATION_WITNESS_SET_CHANGED");
   const record=own(own(aRegistry,witnessId),keyId);
   const key=own(record,"key");
   if(keyId===old.keyId||!keyOk(key)||key.equals(old.key))
    return blocked("ROTATION_KEY_NOT_CHANGED");
   if(own(record,"validFromRevision")!==afterRevision)
    return blocked("ROTATION_NEW_KEY_WINDOW_INVALID");
   previous.delete(witnessId);
  }
  if(previous.size)return blocked("ROTATION_WITNESS_SET_CHANGED");
  return Object.freeze({state:"witness_key_rotation_continuity_observed_for_manual_review",
   ledgerId,beforeRevision,afterRevision,witnessCount:aObs.length,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ROTATION_UNVERIFIED");}
}
