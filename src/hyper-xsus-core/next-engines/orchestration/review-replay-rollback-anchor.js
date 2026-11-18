import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";

const blocked=code=>Object.freeze({state:"rollback_unverified",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const validDigest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const validVersion=x=>Number.isSafeInteger(x)&&x>=0;
const keyValid=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const mac=(key,version,digest)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_REPLAY_ANCHOR_V1",version,digest])).digest("hex");
const field=(object,name)=>{
 const d=Object.getOwnPropertyDescriptor(object,name);
 if(!d||!("value" in d))throw Error("Unsafe anchor field");
 return d.value;
};
/**
 * Phase 63: caller-managed trusted rollback anchor.
 * Store the anchor outside the replay registry's trust domain. The caller
 * must enforce monotonic anchor updates and durable ordering. This module
 * does not write, repair or authorize recovery.
 */
export function createReviewReplayRollbackAnchor({version,digest,key}={}){
 if(!validVersion(version)||!validDigest(digest)||!keyValid(key))
  throw new EngineContractError("INVALID_INPUT","Invalid rollback anchor input");
 return Object.freeze({version:1,sequence:version,registryDigest:digest,
  authenticationTag:mac(key,version,digest)});
}
export function verifyReviewReplayRollbackAnchor({
 anchor,registryDigest,minimumSequence=0,key
}={}){
 if(!keyValid(key)||!validVersion(minimumSequence))
  throw new EngineContractError("INVALID_INPUT","Invalid rollback verification configuration");
 try{
  if(!anchor||typeof anchor!=="object"||Array.isArray(anchor)||
   !validDigest(registryDigest))return blocked("ANCHOR_UNVERIFIED");
  const version=field(anchor,"version");
  const sequence=field(anchor,"sequence");
  const digest=field(anchor,"registryDigest");
  const tag=field(anchor,"authenticationTag");
  if(version!==1||!validVersion(sequence)||!validDigest(digest)||
   typeof tag!=="string"||!/^[a-f0-9]{64}$/.test(tag))
   return blocked("ANCHOR_UNVERIFIED");
  const expected=Buffer.from(mac(key,sequence,digest),"hex");
  if(!timingSafeEqual(expected,Buffer.from(tag,"hex")))
   return blocked("ANCHOR_AUTHENTICATION_FAILED");
  if(sequence<minimumSequence)return blocked("ANCHOR_ROLLBACK_DETECTED");
  if(digest!==registryDigest)return blocked("REGISTRY_ROLLBACK_OR_TAMPERING");
  return Object.freeze({state:"rollback_anchor_verified",sequence,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ANCHOR_UNVERIFIED");}
}
