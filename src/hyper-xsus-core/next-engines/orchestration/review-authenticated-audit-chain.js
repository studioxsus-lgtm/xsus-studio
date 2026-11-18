import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {verifySequencedReviewAuditChain} from "./review-sequenced-audit-chain.js";

const validKey=key=>Buffer.isBuffer(key)&&key.length>=32&&key.length<=4096;
const validId=id=>typeof id==="string"&&/^[a-zA-Z0-9._-]{1,64}$/.test(id);
const payload=(keyId,chain)=>JSON.stringify([
 "XSUS_REVIEW_AUDIT_CHAIN_HMAC_V1",keyId,chain.headFingerprint,chain.links.length
]);
const tag=(key,message)=>createHmac("sha256",key).update(message).digest("hex");
const blocked=reason=>Object.freeze({state:"authentication_blocked",
 findings:Object.freeze([reason]),recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const validate=(key,keyId)=>{
 if(!validKey(key)||!validId(keyId))
  throw new EngineContractError("INVALID_INPUT","Invalid audit authentication configuration");
};
/**
 * Phase 59 — HMAC authentication for a bounded, verified observation chain.
 * Key custody and replay protection across independent sessions are external.
 * Authentication does not establish journal atomicity or authorize recovery.
 */
export function authenticateReviewAuditChain({observations,key,keyId,maxObservations}={}){
 validate(key,keyId);
 const chain=verifySequencedReviewAuditChain({observations,maxObservations});
 if(chain.state!=="chain_observed")return blocked("CHAIN_UNVERIFIED");
 return Object.freeze({version:"1.0.0",algorithm:"HMAC-SHA256",keyId,
  headFingerprint:chain.headFingerprint,linkCount:chain.links.length,
  authenticationTag:tag(key,payload(keyId,chain)),
  state:"authenticated_for_manual_review",recoveryAuthorized:false,
  deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
  sideEffects:false,nextAction:"manual_review"});
}
export function verifyAuthenticatedReviewAuditChain({
 observations,key,keyId,receipt,maxObservations
}={}){
 validate(key,keyId);
 let chain;
 try{chain=verifySequencedReviewAuditChain({observations,maxObservations});}
 catch{return blocked("CHAIN_UNVERIFIED");}
 if(chain.state!=="chain_observed")return blocked("CHAIN_UNVERIFIED");
 try{
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))
   return blocked("AUTHENTICATION_UNVERIFIED");
  const read=name=>{
   const descriptor=Object.getOwnPropertyDescriptor(receipt,name);
   if(!descriptor||!("value" in descriptor))throw Error("Unsafe receipt");
   return descriptor.value;
  };
  const supplied=read("authenticationTag");
  if(read("version")!=="1.0.0"||read("algorithm")!=="HMAC-SHA256"||
   read("keyId")!==keyId||read("headFingerprint")!==chain.headFingerprint||
   read("linkCount")!==chain.links.length||
   typeof supplied!=="string"||!/^[a-f0-9]{64}$/.test(supplied))
   return blocked("AUTHENTICATION_UNVERIFIED");
  const expected=Buffer.from(tag(key,payload(keyId,chain)),"hex");
  if(!timingSafeEqual(expected,Buffer.from(supplied,"hex")))
   return blocked("AUTHENTICATION_UNVERIFIED");
 }catch{return blocked("AUTHENTICATION_UNVERIFIED");}
 return Object.freeze({state:"authenticated_for_manual_review",
  headFingerprint:chain.headFingerprint,findings:Object.freeze([]),
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
}
