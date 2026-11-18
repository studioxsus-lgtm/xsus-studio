import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionCasOutcome} from "./review-witness-decision-cas-outcome.js";

const blocked=code=>Object.freeze({state:"witness_decision_restart_continuity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe restart record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe restart field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const read=registry=>{
 const ledgerId=own(registry,"ledgerId"),revision=own(registry,"revision");
 const minimumRevision=own(registry,"minimumRevision");
 const entries=own(registry,"consumedDecisionIds");
 if(!id(ledgerId)||!seq(revision)||!seq(minimumRevision)||
  !Array.isArray(entries)||entries.length>10000)throw Error("Unsafe registry");
 const ids=new Set();
 for(let i=0;i<entries.length;i++){
  const d=Object.getOwnPropertyDescriptor(entries,String(i));
  if(!d||!("value" in d)||!id(d.value)||ids.has(d.value))
   throw Error("Unsafe registry IDs");
  ids.add(d.value);
 }
 return {ledgerId,revision,minimumRevision,ids};
};
const canonical=r=>[r.ledgerId,r.revision,r.minimumRevision,[...r.ids].sort()];
const payload=(epochId,attemptId,decisionId,registry)=>
 ["XSUS_WITNESS_DECISION_RESTART_V1",epochId,attemptId,decisionId,canonical(registry)];
/**
 * Phase 88: compare a previously authenticated CAS claim to an authenticated
 * post-restart observation. Neither epoch IDs nor HMAC receipts prove a real
 * process restart, durable fsync, independent authority, or external freshness.
 * No writes, recovery, admission or retry authorization.
 */
export function createReviewWitnessDecisionRestartReceipt({
 epochId,attemptId,decisionId,registry,authorityKey
}={}){
 if(!id(epochId)||!id(attemptId)||!id(decisionId)||!keyOk(authorityKey))
  throw new EngineContractError("INVALID_INPUT","Invalid restart receipt configuration");
 try{
  const authenticationTag=createHmac("sha256",authorityKey)
   .update(JSON.stringify(payload(epochId,attemptId,decisionId,read(registry)))).digest("hex");
  return Object.freeze({version:1,epochId,attemptId,decisionId,authenticationTag});
 }catch{throw new EngineContractError("INVALID_INPUT","Invalid restart registry");}
}
export function inspectReviewWitnessDecisionRestartContinuity({
 beforeRegistry,afterRegistry,postRestartRegistry,receipt,restartReceipt,
 authorityKey,expectedAttemptId,expectedBeforeEpochId,expectedAfterEpochId,
 expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(authorityKey)||!id(expectedAttemptId)||!id(expectedBeforeEpochId)||
  !id(expectedAfterEpochId)||expectedBeforeEpochId===expectedAfterEpochId||
  !id(expectedDecisionId))
  throw new EngineContractError("INVALID_INPUT","Invalid restart inspection configuration");
 try{
  const cas=inspectReviewWitnessDecisionCasOutcome({
   beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
   expectedRegistryRevision,expectedMinimumRevision,
   decision,reviewKey,expectedReviewerId,expectedDecisionId,
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds});
  if(cas.state!=="witness_decision_cas_claim_observed_for_manual_review")
   return blocked("RESTART_CAS_UNVERIFIED");
  const after=read(afterRegistry),post=read(postRestartRegistry);
  if(after.ledgerId!==ledgerId||post.ledgerId!==ledgerId||
   post.revision<after.revision||post.minimumRevision<after.minimumRevision||
   [...after.ids].some(x=>!post.ids.has(x))||
   !post.ids.has(expectedDecisionId))
   return blocked("RESTART_REGISTRY_ROLLBACK");
  if(own(restartReceipt,"version")!==1||
   own(restartReceipt,"epochId")!==expectedAfterEpochId||
   own(restartReceipt,"attemptId")!==expectedAttemptId||
   own(restartReceipt,"decisionId")!==expectedDecisionId)
   return blocked("RESTART_RECEIPT_CONTEXT_MISMATCH");
  const tag=createHmac("sha256",authorityKey)
   .update(JSON.stringify(payload(expectedAfterEpochId,expectedAttemptId,
    expectedDecisionId,post))).digest("hex");
  if(!eq(own(restartReceipt,"authenticationTag"),tag))
   return blocked("RESTART_RECEIPT_AUTHENTICATION_FAILED");
  return Object.freeze({state:"witness_decision_restart_continuity_observed_for_manual_review",
   ledgerId,decisionId:expectedDecisionId,attemptId:expectedAttemptId,
   beforeEpochId:expectedBeforeEpochId,afterEpochId:expectedAfterEpochId,
   casRevision:after.revision,observedRevision:post.revision,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("RESTART_CONTINUITY_UNVERIFIED");}
}
