import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";

const blocked=code=>Object.freeze({state:"durability_receipt_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe receipt");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe field");
 return d.value;
};
const digest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const tag=(key,fields)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_STORAGE_DURABILITY_RECEIPT_V1",...fields]))
 .digest("hex");
/**
 * Phase 69: authenticated *claims* of durable storage, not proof of fsync.
 * The trusted storage provider must issue receipts after its own durability
 * barrier and maintain an independent monotonic operation/replay ledger.
 * This module performs no I/O, writes, retries or recovery.
 */
export function createReviewStorageDurabilityReceipt({
 operationId,sequence,registryDigest,storageEpoch,key
}={}){
 if(!id(operationId)||!id(storageEpoch)||!seq(sequence)||
  !digest(registryDigest)||!keyOk(key))
  throw new EngineContractError("INVALID_INPUT","Invalid durability receipt");
 const fields=[operationId,sequence,registryDigest,storageEpoch];
 return Object.freeze({version:1,operationId,sequence,registryDigest,
  storageEpoch,authenticationTag:tag(key,fields)});
}
export function inspectReviewStorageDurabilityReceipt({
 receipt,operationId,sequence,registryDigest,storageEpoch,
 previouslyAcceptedOperationIds=[],key
}={}){
 if(!id(operationId)||!id(storageEpoch)||!seq(sequence)||
  !digest(registryDigest)||!keyOk(key)||
  !Array.isArray(previouslyAcceptedOperationIds)||
  previouslyAcceptedOperationIds.length>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid durability inspection");
 try{
  const fields=["version","operationId","sequence","registryDigest",
   "storageEpoch","authenticationTag"].map(k=>own(receipt,k));
  const [version,rId,rSequence,rDigest,rEpoch,rTag]=fields;
  if(version!==1||!id(rId)||!seq(rSequence)||!digest(rDigest)||
   !id(rEpoch)||!digest(rTag))return blocked("RECEIPT_UNVERIFIED");
  const expected=Buffer.from(tag(key,[rId,rSequence,rDigest,rEpoch]),"hex");
  if(!timingSafeEqual(expected,Buffer.from(rTag,"hex")))
   return blocked("RECEIPT_AUTHENTICATION_FAILED");
  if(rId!==operationId||rSequence!==sequence||
   rDigest!==registryDigest||rEpoch!==storageEpoch)
   return blocked("RECEIPT_CONTEXT_MISMATCH");
  if(previouslyAcceptedOperationIds.some(x=>x===rId))
   return blocked("DURABILITY_RECEIPT_REPLAYED");
  return Object.freeze({state:"durability_claim_authenticated_for_manual_review",
   operationId:rId,sequence:rSequence,registryDigest:rDigest,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("RECEIPT_UNVERIFIED");}
}
