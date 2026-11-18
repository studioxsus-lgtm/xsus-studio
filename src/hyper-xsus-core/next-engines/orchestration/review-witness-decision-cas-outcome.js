import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionReplay} from "./review-witness-decision-replay.js";

const blocked=code=>Object.freeze({state:"witness_decision_cas_outcome_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe CAS record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe CAS field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const ids=registry=>{
 const list=own(registry,"consumedDecisionIds");
 if(!Array.isArray(list)||list.length>10000)throw Error("Unsafe consumed IDs");
 const set=new Set();
 for(let i=0;i<list.length;i++){
  const d=Object.getOwnPropertyDescriptor(list,String(i));
  if(!d||!("value" in d)||!id(d.value)||set.has(d.value))
   throw Error("Unsafe consumed ID");
  set.add(d.value);
 }
 return set;
};
const snapshot=registry=>{
 const ledgerId=own(registry,"ledgerId"),revision=own(registry,"revision");
 const minimumRevision=own(registry,"minimumRevision"),used=ids(registry);
 if(!id(ledgerId)||!seq(revision)||!seq(minimumRevision))
  throw Error("Unsafe CAS snapshot");
 return {ledgerId,revision,minimumRevision,used};
};
const canonical=(s)=>[s.ledgerId,s.revision,s.minimumRevision,[...s.used].sort()];
const payload=(decisionId,attemptId,outcome,before,after)=>
 ["XSUS_WITNESS_DECISION_CAS_V1",decisionId,attemptId,outcome,
  canonical(before),canonical(after)];
/**
 * Phase 87: HMAC-authenticated, read-only INSPECTION of a claimed external
 * CAS result. A signed claim does not prove that CAS or fsync actually ran.
 * A separately trusted authority must attest key custody, uniqueness of
 * attemptId and durable atomic updates; this code never performs CAS.
 */
export function createReviewWitnessDecisionCasReceipt({
 decisionId,attemptId,outcome,beforeRegistry,afterRegistry,authorityKey
}={}){
 if(!id(decisionId)||!id(attemptId)||!["committed","conflict","rejected"].includes(outcome)||
  !keyOk(authorityKey))
  throw new EngineContractError("INVALID_INPUT","Invalid decision CAS receipt configuration");
 try{
  const before=snapshot(beforeRegistry),after=snapshot(afterRegistry);
  const authenticationTag=createHmac("sha256",authorityKey)
   .update(JSON.stringify(payload(decisionId,attemptId,outcome,before,after))).digest("hex");
  return Object.freeze({version:1,decisionId,attemptId,outcome,authenticationTag});
 }catch{
  throw new EngineContractError("INVALID_INPUT","Invalid decision CAS snapshots");
 }
}
export function inspectReviewWitnessDecisionCasOutcome({
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(authorityKey)||!id(expectedAttemptId)||!id(expectedDecisionId))
  throw new EngineContractError("INVALID_INPUT","Invalid decision CAS inspection configuration");
 try{
  const preflight=inspectReviewWitnessDecisionReplay({
   trustedRegistry:beforeRegistry,expectedRegistryRevision,expectedMinimumRevision,
   decision,reviewKey,expectedReviewerId,expectedDecisionId,
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds});
  if(preflight.state!=="witness_decision_replay_preflight_observed_for_manual_review")
   return blocked("DECISION_CAS_PREFLIGHT_UNVERIFIED");
  const before=snapshot(beforeRegistry),after=snapshot(afterRegistry);
  const outcome=own(receipt,"outcome");
  if(own(receipt,"version")!==1||own(receipt,"decisionId")!==expectedDecisionId||
   own(receipt,"attemptId")!==expectedAttemptId||
   !["committed","conflict","rejected"].includes(outcome))
   return blocked("DECISION_CAS_RECEIPT_CONTEXT_MISMATCH");
  const tag=createHmac("sha256",authorityKey).update(JSON.stringify(
   payload(expectedDecisionId,expectedAttemptId,outcome,before,after))).digest("hex");
  if(!eq(own(receipt,"authenticationTag"),tag))
   return blocked("DECISION_CAS_RECEIPT_AUTHENTICATION_FAILED");
  if(before.ledgerId!==after.ledgerId||after.minimumRevision<before.minimumRevision)
   return blocked("DECISION_CAS_REGISTRY_ROLLBACK");
  if(outcome!=="committed")
   return blocked(outcome==="conflict"?"DECISION_CAS_CONFLICT_REQUIRES_RECHECK":
    "DECISION_CAS_REJECTED");
  if(before.revision===Number.MAX_SAFE_INTEGER||
   after.revision!==before.revision+1||
   after.used.size!==before.used.size+1||
   !after.used.has(expectedDecisionId)||
   [...before.used].some(x=>!after.used.has(x)))
   return blocked("DECISION_CAS_TRANSITION_UNVERIFIED");
  return Object.freeze({state:"witness_decision_cas_claim_observed_for_manual_review",
   ledgerId,decisionId:expectedDecisionId,attemptId:expectedAttemptId,
   beforeRevision:before.revision,afterRevision:after.revision,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("DECISION_CAS_UNVERIFIED");}
}
