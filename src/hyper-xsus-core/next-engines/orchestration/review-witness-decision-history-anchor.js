import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionRestartHistory} from "./review-witness-decision-restart-history.js";

const blocked=code=>Object.freeze({state:"witness_decision_history_anchor_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe anchor data");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe anchor field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const eq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const registry=r=>{
 const ledgerId=own(r,"ledgerId"),revision=own(r,"revision");
 const minimumRevision=own(r,"minimumRevision"),list=own(r,"consumedDecisionIds");
 if(!id(ledgerId)||!seq(revision)||!seq(minimumRevision)||
  !Array.isArray(list)||list.length>10000)throw Error("Unsafe registry");
 const ids=new Set();
 for(let i=0;i<list.length;i++){
  const d=Object.getOwnPropertyDescriptor(list,String(i));
  if(!d||!("value" in d)||!id(d.value)||ids.has(d.value))
   throw Error("Unsafe registry IDs");
  ids.add(d.value);
 }
 return [ledgerId,revision,minimumRevision,[...ids].sort()];
};
const payload=(ledgerId,decisionId,attemptId,expectedBeforeEpochId,observations,expectedEpochIds)=>{
 const entries=[];
 for(let i=0;i<observations.length;i++){
  const a=Object.getOwnPropertyDescriptor(observations,String(i));
  const b=Object.getOwnPropertyDescriptor(expectedEpochIds,String(i));
  if(!a||!("value" in a)||!b||!("value" in b)||!id(b.value))
   throw Error("Sparse history");
  const item=a.value,receipt=own(item,"receipt");
  entries.push([b.value,registry(own(item,"registry")),
   own(receipt,"version"),own(receipt,"epochId"),own(receipt,"attemptId"),
   own(receipt,"decisionId"),own(receipt,"authenticationTag")]);
 }
 return ["XSUS_WITNESS_DECISION_HISTORY_ANCHOR_V1",ledgerId,decisionId,
  attemptId,expectedBeforeEpochId,entries];
};
/**
 * Phase 90: HMAC anchor over the COMPLETE authenticated restart history.
 * Verification REQUIRES an independently trusted expected tag and count.
 * A locally generated tag cannot prove external publication or freshness.
 * No writes, automatic recovery, deletion or execution.
 */
export function createReviewWitnessDecisionHistoryAnchor({
 ledgerId,decisionId,attemptId,expectedBeforeEpochId,
 observations,expectedEpochIds,anchorKey
}={}){
 if(!id(ledgerId)||!id(decisionId)||!id(attemptId)||
  !id(expectedBeforeEpochId)||!keyOk(anchorKey)||
  !Array.isArray(observations)||!Array.isArray(expectedEpochIds)||
  observations.length<2||observations.length>32||
  observations.length!==expectedEpochIds.length)
  throw new EngineContractError("INVALID_INPUT","Invalid history anchor configuration");
 try{
  const data=payload(ledgerId,decisionId,attemptId,expectedBeforeEpochId,
   observations,expectedEpochIds);
  const authenticationTag=createHmac("sha256",anchorKey)
   .update(JSON.stringify(data)).digest("hex");
  return Object.freeze({version:1,ledgerId,decisionId,attemptId,
   observationCount:observations.length,authenticationTag});
 }catch{throw new EngineContractError("INVALID_INPUT","Invalid history anchor data");}
}
export function inspectReviewWitnessDecisionHistoryAnchor({
 anchor,anchorKey,trustedAnchorTag,trustedObservationCount,
 observations,expectedEpochIds,maxObservations=16,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(anchorKey)||!hex(trustedAnchorTag)||
  !seq(trustedObservationCount)||trustedObservationCount<2||
  !id(ledgerId)||!id(expectedDecisionId)||!id(expectedAttemptId)||
  !id(expectedBeforeEpochId))
  throw new EngineContractError("INVALID_INPUT","Invalid trusted history anchor");
 try{
  if(observations.length!==trustedObservationCount)
   return blocked("HISTORY_ANCHOR_TRUNCATION_DETECTED");
  const result=inspectReviewWitnessDecisionRestartHistory({
   observations,expectedEpochIds,maxObservations,beforeRegistry,afterRegistry,
   receipt,authorityKey,expectedAttemptId,expectedBeforeEpochId,
   expectedRegistryRevision,expectedMinimumRevision,decision,reviewKey,
   expectedReviewerId,expectedDecisionId,previousRounds,previousChain,
   trustedPreviousHeadTag,trustedPreviousRoundCount,candidates,ledgerId,
   ledgerKey,chainKey,startingRevision,minimumSequence,requiredWitnesses,
   maxWitnesses,maxRounds});
  if(result.state!=="witness_decision_restart_history_observed_for_manual_review")
   return blocked("HISTORY_ANCHOR_HISTORY_UNVERIFIED");
  if(own(anchor,"version")!==1||own(anchor,"ledgerId")!==ledgerId||
   own(anchor,"decisionId")!==expectedDecisionId||
   own(anchor,"attemptId")!==expectedAttemptId||
   own(anchor,"observationCount")!==trustedObservationCount)
   return blocked("HISTORY_ANCHOR_CONTEXT_MISMATCH");
  const calculated=createHmac("sha256",anchorKey).update(JSON.stringify(
   payload(ledgerId,expectedDecisionId,expectedAttemptId,
    expectedBeforeEpochId,observations,expectedEpochIds))).digest("hex");
  if(!eq(own(anchor,"authenticationTag"),calculated)||
   !eq(calculated,trustedAnchorTag))
   return blocked("HISTORY_ANCHOR_AUTHENTICATION_FAILED");
  return Object.freeze({state:"witness_decision_history_anchor_observed_for_manual_review",
   ledgerId,decisionId:expectedDecisionId,observationCount:trustedObservationCount,
   lastRevision:result.lastRevision,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("HISTORY_ANCHOR_UNVERIFIED");}
}
