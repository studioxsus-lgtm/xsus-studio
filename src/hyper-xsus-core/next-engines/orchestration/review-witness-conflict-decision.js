import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessChainConflicts} from "./review-witness-chain-conflicts.js";

const blocked=code=>Object.freeze({state:"witness_conflict_decision_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe decision");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe decision field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const sign=(key,values)=>createHmac("sha256",key).update(JSON.stringify(values)).digest("hex");
const payload=(ledgerId,baseHead,firstHead,secondHead,decisionId,reviewerId,disposition)=>
 ["XSUS_WITNESS_CONFLICT_DECISION_V1",ledgerId,baseHead,firstHead,secondHead,
  decisionId,reviewerId,disposition];
const dispositions=new Set(["defer","escalate","reject_both"]);
/**
 * Phase 85: signed EXTERNAL human-review disposition bound to an exact
 * competing proposal pair and independently trusted base anchor.
 * Does not approve either candidate or grant execution/recovery authority.
 * Reviewer identity, key custody, freshness and uniqueness of decisionId
 * must be enforced by a separate trusted system.
 */
export function createReviewWitnessConflictDecision({
 ledgerId,baseHead,firstHead,secondHead,decisionId,reviewerId,
 disposition,reviewKey
}={}){
 if(!id(ledgerId)||!hex(baseHead)||!hex(firstHead)||!hex(secondHead)||
  !id(decisionId)||!id(reviewerId)||!dispositions.has(disposition)||
  !keyOk(reviewKey))
  throw new EngineContractError("INVALID_INPUT","Invalid conflict decision configuration");
 return Object.freeze({version:1,ledgerId,baseHead,firstHead,secondHead,
  decisionId,reviewerId,disposition,authenticationTag:sign(reviewKey,payload(
   ledgerId,baseHead,firstHead,secondHead,decisionId,reviewerId,disposition))});
}
export function inspectReviewWitnessConflictDecision({
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(reviewKey)||!id(expectedReviewerId)||!id(expectedDecisionId)||
  !id(ledgerId)||!hex(trustedPreviousHeadTag))
  throw new EngineContractError("INVALID_INPUT","Invalid conflict decision inspection configuration");
 try{
  const result=inspectReviewWitnessChainConflicts({
   previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
   candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
   requiredWitnesses,maxWitnesses,maxRounds});
  const acceptable=new Set([
   "witness_chain_duplicate_proposals_observed_for_manual_review",
   "witness_chain_prefix_compatible_proposals_observed_for_manual_review"]);
  if(result.state==="witness_chain_conflict_blocked"){
   if(!result.findings?.includes("CHAIN_COMPETING_FORK_DETECTED"))
    return blocked("CONFLICT_PROPOSALS_UNVERIFIED");
  }else if(!acceptable.has(result.state)){
   return blocked("CONFLICT_PROPOSALS_UNVERIFIED");
  }
  const first=Object.getOwnPropertyDescriptor(candidates,"0");
  const second=Object.getOwnPropertyDescriptor(candidates,"1");
  if(!first||!("value" in first)||!second||!("value" in second))
   return blocked("CONFLICT_PROPOSALS_UNVERIFIED");
  const firstHead=own(first.value,"trustedHeadTag");
  const secondHead=own(second.value,"trustedHeadTag");
  const disposition=own(decision,"disposition");
  const decisionId=own(decision,"decisionId"),reviewerId=own(decision,"reviewerId");
  if(own(decision,"version")!==1||own(decision,"ledgerId")!==ledgerId||
   !eq(own(decision,"baseHead"),trustedPreviousHeadTag)||
   !eq(own(decision,"firstHead"),firstHead)||
   !eq(own(decision,"secondHead"),secondHead)||
   decisionId!==expectedDecisionId||reviewerId!==expectedReviewerId||
   !dispositions.has(disposition))
   return blocked("CONFLICT_DECISION_CONTEXT_MISMATCH");
  const expected=sign(reviewKey,payload(ledgerId,trustedPreviousHeadTag,
   firstHead,secondHead,decisionId,reviewerId,disposition));
  if(!eq(own(decision,"authenticationTag"),expected))
   return blocked("CONFLICT_DECISION_AUTHENTICATION_FAILED");
  return Object.freeze({state:"witness_conflict_decision_observed_for_manual_review",
   ledgerId,decisionId,reviewerId,disposition,
   conflictState:result.state,recoveryAuthorized:false,deletionAuthorized:false,
   retrySafe:false,executionAuthorized:false,sideEffects:false,
   nextAction:"manual_review"});
 }catch{return blocked("CONFLICT_DECISION_UNVERIFIED");}
}
