import {timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessChainExtension} from "./review-witness-chain-extension.js";

const blocked=code=>Object.freeze({state:"witness_chain_conflict_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe chain candidate");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe chain candidate field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
/**
 * Phase 84: compare two separately verified extensions of the SAME
 * independently anchored base. Identical proposals are duplicates;
 * prefix-compatible proposals are not forks but do not imply admission.
 * Divergence at any shared position is a fork. No automatic winner,
 * persistence, CAS, conflict resolution or side effects.
 */
export function inspectReviewWitnessChainConflicts({
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,
 minimumSequence=0,requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!seq(trustedPreviousRoundCount)||trustedPreviousRoundCount<3||
  !hex(trustedPreviousHeadTag)||!Array.isArray(candidates)||candidates.length!==2)
  throw new EngineContractError("INVALID_INPUT","Invalid witness chain conflict configuration");
 let stage="INITIAL";
 try{
  const checked=[];
  for(let i=0;i<2;i++){
   stage="CANDIDATE_"+i;
   const d=Object.getOwnPropertyDescriptor(candidates,String(i));
   if(!d||!("value" in d))return blocked("CHAIN_CANDIDATE_UNVERIFIED");
   const c=d.value,rounds=own(c,"rounds"),chain=own(c,"chain");
   const head=own(c,"trustedHeadTag"),count=own(c,"trustedRoundCount");
   stage="EXTENSION_"+i;
   const result=inspectReviewWitnessChainExtension({
    previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
    nextRounds:rounds,nextChain:chain,trustedNextHeadTag:head,
    trustedNextRoundCount:count,ledgerId,ledgerKey,chainKey,
    startingRevision,minimumSequence,requiredWitnesses,maxWitnesses,maxRounds});
   if(result.state!=="witness_chain_extension_observed_for_manual_review")
    return blocked("CHAIN_CANDIDATE_UNVERIFIED");
   const links=own(chain,"links");
   if(!Array.isArray(links)||links.length!==count)
    return blocked("CHAIN_CANDIDATE_UNVERIFIED");
   checked.push({links,count,head});
   stage="CANDIDATE_CHECKED_"+i;
  }
  stage="COMPARE";
  const [a,b]=checked;
  for(let i=0;i<Math.min(a.count,b.count);i++){
   const da=Object.getOwnPropertyDescriptor(a.links,String(i));
   const db=Object.getOwnPropertyDescriptor(b.links,String(i));
   if(!da||!("value" in da)||!db||!("value" in db))
    return blocked("CHAIN_CANDIDATE_UNVERIFIED");
   if(!eq(own(da.value,"authenticationTag"),own(db.value,"authenticationTag")))
    return blocked("CHAIN_COMPETING_FORK_DETECTED");
  }
  if(a.count===b.count){
   if(!eq(a.head,b.head))return blocked("CHAIN_COMPETING_FORK_DETECTED");
   return Object.freeze({state:"witness_chain_duplicate_proposals_observed_for_manual_review",
    ledgerId,roundCount:a.count,recoveryAuthorized:false,deletionAuthorized:false,
    retrySafe:false,executionAuthorized:false,sideEffects:false,
    nextAction:"manual_review"});
  }
  return Object.freeze({state:"witness_chain_prefix_compatible_proposals_observed_for_manual_review",
   ledgerId,shorterRoundCount:Math.min(a.count,b.count),
   longerRoundCount:Math.max(a.count,b.count),
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("CHAIN_CONFLICT_UNVERIFIED_"+stage);}
}
