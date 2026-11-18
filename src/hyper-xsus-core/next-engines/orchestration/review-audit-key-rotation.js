import {EngineContractError} from "../contracts.js";
import {verifyAuthenticatedReviewAuditChain} from "./review-authenticated-audit-chain.js";

const safeId=id=>typeof id==="string"&&/^[A-Za-z0-9._-]{1,64}$/.test(id);
const blocked=code=>Object.freeze({state:"authentication_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
/**
 * Phase 60: explicit active-key verification and bounded local replay registry.
 * Caller owns key custody and durable replay storage; this in-memory registry
 * cannot prevent replay after process restart or across independent instances.
 */
export function createReviewAuditKeyRotationGuard({keys,activeKeyId,maxReceipts=1024}={}){
 if(!keys||Object.getPrototypeOf(keys)!==Object.prototype||
  !safeId(activeKeyId)||!Number.isSafeInteger(maxReceipts)||
  maxReceipts<1||maxReceipts>100000)
  throw new EngineContractError("INVALID_INPUT","Invalid key rotation configuration");
 const ring=new Map();
 for(const keyId of Object.keys(keys)){
  const descriptor=Object.getOwnPropertyDescriptor(keys,keyId);
  if(!safeId(keyId)||!descriptor||!("value" in descriptor)||
   !Buffer.isBuffer(descriptor.value)||descriptor.value.length<32||
   descriptor.value.length>4096)
   throw new EngineContractError("INVALID_INPUT","Invalid audit key");
  ring.set(keyId,Buffer.from(descriptor.value));
 }
 if(!ring.has(activeKeyId))
  throw new EngineContractError("INVALID_INPUT","Active key missing");
 const observed=new Set();
 function verify({observations,receipt,maxObservations}={}){
  let keyId,tag;
  try{
   if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))
    return blocked("AUTHENTICATION_UNVERIFIED");
   const id=Object.getOwnPropertyDescriptor(receipt,"keyId");
   const signature=Object.getOwnPropertyDescriptor(receipt,"authenticationTag");
   if(!id||!("value" in id)||!signature||!("value" in signature))
    return blocked("AUTHENTICATION_UNVERIFIED");
   keyId=id.value;tag=signature.value;
  }catch{return blocked("AUTHENTICATION_UNVERIFIED");}
  if(!safeId(keyId)||!ring.has(keyId))return blocked("UNKNOWN_KEY");
  if(keyId!==activeKeyId)return blocked("RETIRED_KEY");
  if(typeof tag!=="string"||!/^[a-f0-9]{64}$/.test(tag))
   return blocked("AUTHENTICATION_UNVERIFIED");
  const result=verifyAuthenticatedReviewAuditChain({
   observations,key:ring.get(keyId),keyId,receipt,maxObservations});
  if(result.state!=="authenticated_for_manual_review")return result;
  const identity=keyId+":"+tag;
  if(observed.has(identity))return blocked("RECEIPT_REPLAYED");
  if(observed.size>=maxReceipts)return blocked("REPLAY_REGISTRY_FULL");
  observed.add(identity);
  return result;
 }
 return Object.freeze({verify});
}
