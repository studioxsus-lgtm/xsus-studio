import {EngineContractError} from "../contracts.js";
import {inspectReviewStorageDurabilityReceipt} from "./review-storage-durability-receipt.js";

const blocked=code=>Object.freeze({state:"durability_history_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(object,key)=>{
 if(!object||typeof object!=="object"||Array.isArray(object))
  throw Error("Unsafe history record");
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!("value" in descriptor))throw Error("Unsafe history field");
 return descriptor.value;
};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const sequence=x=>Number.isSafeInteger(x)&&x>=0;
/**
 * Phase 70: validate a bounded, ordered chain of authenticated durability
 * claims. Every record must name the preceding registry digest and advance
 * its sequence by exactly one. This is a read-only consistency assessment:
 * it does not prove disk durability, authenticate the history's completeness,
 * or provide an independent rollback anchor. The caller must provide a
 * trusted starting state and maintain a persistent replay ledger.
 */
export function inspectReviewDurabilityTransitionHistory({
 records,startingSequence,startingDigest,key,maxRecords=256,
 previouslyAcceptedOperationIds=[]
}={}){
 if(!Array.isArray(records)||records.length<1||
  !Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>1024||
  records.length>maxRecords||!sequence(startingSequence)||
  !hex(startingDigest)||!Buffer.isBuffer(key)||key.length<32||
  key.length>4096||!Array.isArray(previouslyAcceptedOperationIds)||
  previouslyAcceptedOperationIds.length>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid durability history configuration");
 try{
  const seen=new Set();
  for(const value of previouslyAcceptedOperationIds){
   if(!id(value)||seen.has(value))return blocked("REPLAY_LEDGER_UNVERIFIED");
   seen.add(value);
  }
  let previousSequence=startingSequence;
  let previousDigest=startingDigest;
  for(let index=0;index<records.length;index++){
   const descriptor=Object.getOwnPropertyDescriptor(records,String(index));
   if(!descriptor||!("value" in descriptor))
    return blocked("HISTORY_RECORD_UNVERIFIED");
   const record=descriptor.value;
   const operationId=own(record,"operationId");
   const nextSequence=own(record,"sequence");
   const nextDigest=own(record,"registryDigest");
   const previous=own(record,"previousRegistryDigest");
   const storageEpoch=own(record,"storageEpoch");
   const receipt=own(record,"receipt");
   if(!id(operationId)||!id(storageEpoch)||!sequence(nextSequence)||
    !hex(nextDigest)||!hex(previous))
    return blocked("HISTORY_RECORD_UNVERIFIED");
   if(previousSequence===Number.MAX_SAFE_INTEGER||
    nextSequence!==previousSequence+1||previous!==previousDigest||
    nextDigest===previousDigest)
    return blocked("HISTORY_TRANSITION_DISCONTINUITY");
   if(seen.has(operationId))return blocked("HISTORY_OPERATION_REPLAYED");
   const verified=inspectReviewStorageDurabilityReceipt({
    receipt,operationId,sequence:nextSequence,
    registryDigest:nextDigest,storageEpoch,key});
   if(verified.state!=="durability_claim_authenticated_for_manual_review")
    return blocked(verified.findings?.[0]??"HISTORY_RECEIPT_UNVERIFIED");
   seen.add(operationId);
   previousSequence=nextSequence;
   previousDigest=nextDigest;
  }
  return Object.freeze({state:"durability_history_consistent_for_manual_review",
   startingSequence,endingSequence:previousSequence,
   endingDigest:previousDigest,recordCount:records.length,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("HISTORY_RECORD_UNVERIFIED");}
}
