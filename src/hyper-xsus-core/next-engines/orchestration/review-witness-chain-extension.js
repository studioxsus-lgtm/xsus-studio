import {timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessRotationChain} from "./review-witness-rotation-chain.js";

const blocked=code=>Object.freeze({state:"witness_chain_extension_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe chain");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
/**
 * Phase 83: read-only proof that a new authenticated full history extends
 * an independently anchored earlier full history without rewriting its
 * prefix. This does NOT commit the new anchor or provide an external CAS,
 * freshness oracle, durable storage, or globally authoritative witness.
 */
export function inspectReviewWitnessChainExtension({
 previousRounds,previousChain,nextRounds,nextChain,
 trustedPreviousHeadTag,trustedPreviousRoundCount,
 trustedNextHeadTag,trustedNextRoundCount,
 ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!seq(trustedPreviousRoundCount)||!seq(trustedNextRoundCount)||
  trustedPreviousRoundCount<3||trustedNextRoundCount<=trustedPreviousRoundCount||
  !hex(trustedPreviousHeadTag)||!hex(trustedNextHeadTag))
  throw new EngineContractError("INVALID_INPUT","Invalid chain extension anchors");
 try{
  const options={ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds};
  const old=inspectReviewWitnessRotationChain({
   ...options,rounds:previousRounds,chain:previousChain,
   trustedHeadTag:trustedPreviousHeadTag,trustedRoundCount:trustedPreviousRoundCount});
  if(old.state!=="witness_rotation_chain_observed_for_manual_review")
   return blocked("PREVIOUS_CHAIN_UNVERIFIED");
  const next=inspectReviewWitnessRotationChain({
   ...options,rounds:nextRounds,chain:nextChain,
   trustedHeadTag:trustedNextHeadTag,trustedRoundCount:trustedNextRoundCount});
  if(next.state!=="witness_rotation_chain_observed_for_manual_review")
   return blocked("NEXT_CHAIN_UNVERIFIED");
  const previousLinks=own(previousChain,"links"),nextLinks=own(nextChain,"links");
  if(!Array.isArray(previousLinks)||!Array.isArray(nextLinks)||
   nextLinks.length<=previousLinks.length)
   return blocked("CHAIN_EXTENSION_ROLLBACK");
  for(let i=0;i<previousLinks.length;i++){
   const a=Object.getOwnPropertyDescriptor(previousLinks,String(i));
   const b=Object.getOwnPropertyDescriptor(nextLinks,String(i));
   if(!a||!("value" in a)||!b||!("value" in b))
    return blocked("CHAIN_EXTENSION_PREFIX_UNVERIFIED");
   if(own(a.value,"revision")!==own(b.value,"revision")||
    !eq(own(a.value,"authenticationTag"),own(b.value,"authenticationTag"))||
    !eq(own(a.value,"previousTag"),own(b.value,"previousTag")))
    return blocked("CHAIN_EXTENSION_FORK_DETECTED");
  }
  const firstNew=Object.getOwnPropertyDescriptor(nextLinks,String(previousLinks.length));
  if(!firstNew||!("value" in firstNew)||
   !eq(own(firstNew.value,"previousTag"),trustedPreviousHeadTag))
   return blocked("CHAIN_EXTENSION_DISCONNECTED");
  return Object.freeze({state:"witness_chain_extension_observed_for_manual_review",
   ledgerId,startingRevision,previousRoundCount:trustedPreviousRoundCount,
   nextRoundCount:trustedNextRoundCount,addedRounds:trustedNextRoundCount-trustedPreviousRoundCount,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("CHAIN_EXTENSION_UNVERIFIED");}
}
