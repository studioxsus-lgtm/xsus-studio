import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessDecisionRestartContinuity} from "./review-witness-decision-restart-continuity.js";

const blocked=code=>Object.freeze({state:"witness_decision_restart_history_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe history record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe history field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const equal=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const read=registry=>{
 const ledgerId=own(registry,"ledgerId"),revision=own(registry,"revision");
 const minimumRevision=own(registry,"minimumRevision"),list=own(registry,"consumedDecisionIds");
 if(!id(ledgerId)||!seq(revision)||!seq(minimumRevision)||
  !Array.isArray(list)||list.length>10000)throw Error("Unsafe registry");
 const used=new Set();
 for(let i=0;i<list.length;i++){
  const d=Object.getOwnPropertyDescriptor(list,String(i));
  if(!d||!("value" in d)||!id(d.value)||used.has(d.value))
   throw Error("Unsafe registry ID");
  used.add(d.value);
 }
 return {ledgerId,revision,minimumRevision,used};
};
const canonical=s=>[s.ledgerId,s.revision,s.minimumRevision,[...s.used].sort()];
const tag=(key,epochId,attemptId,decisionId,registry)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_WITNESS_DECISION_RESTART_V1",
  epochId,attemptId,decisionId,canonical(registry)])).digest("hex");
/**
 * Phase 89: read-only multi-epoch continuity inspection.
 * The first observation must pass Phase 88. Every subsequent observation
 * has a separately authenticated registry receipt and externally expected
 * epoch ID. Epoch chronology, durable writes and independent key custody
 * remain obligations of the trusted external authority.
 */
export function inspectReviewWitnessDecisionRestartHistory({
 observations,expectedEpochIds,maxObservations=16,
 beforeRegistry,afterRegistry,receipt,authorityKey,expectedAttemptId,
 expectedBeforeEpochId,expectedRegistryRevision,expectedMinimumRevision,
 decision,reviewKey,expectedReviewerId,expectedDecisionId,
 previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
 candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!keyOk(authorityKey)||!id(expectedBeforeEpochId)||!id(expectedAttemptId)||
  !id(expectedDecisionId)||!Array.isArray(observations)||
  !Array.isArray(expectedEpochIds)||observations.length<2||
  observations.length>maxObservations||observations.length!==expectedEpochIds.length||
  !seq(maxObservations)||maxObservations>32)
  throw new EngineContractError("INVALID_INPUT","Invalid restart history configuration");
 try{
  const seenEpochs=new Set([expectedBeforeEpochId]);
  let prior=null,firstEpoch=null,lastEpoch=null;
  for(let i=0;i<observations.length;i++){
   const entry=Object.getOwnPropertyDescriptor(observations,String(i));
   const epoch=Object.getOwnPropertyDescriptor(expectedEpochIds,String(i));
   if(!entry||!("value" in entry)||!epoch||!("value" in epoch))
    return blocked("RESTART_HISTORY_SPARSE");
   const expectedEpochId=epoch.value;
   if(!id(expectedEpochId)||seenEpochs.has(expectedEpochId))
    return blocked("RESTART_HISTORY_EPOCH_REPLAY");
   seenEpochs.add(expectedEpochId);
   const record=entry.value,registry=own(record,"registry"),restartReceipt=own(record,"receipt");
   if(i===0){
    const result=inspectReviewWitnessDecisionRestartContinuity({
     beforeRegistry,afterRegistry,postRestartRegistry:registry,receipt,restartReceipt,
     authorityKey,expectedAttemptId,expectedBeforeEpochId,
     expectedAfterEpochId:expectedEpochId,expectedRegistryRevision,expectedMinimumRevision,
     decision,reviewKey,expectedReviewerId,expectedDecisionId,
     previousRounds,previousChain,trustedPreviousHeadTag,trustedPreviousRoundCount,
     candidates,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence,
     requiredWitnesses,maxWitnesses,maxRounds});
    if(result.state!=="witness_decision_restart_continuity_observed_for_manual_review")
     return blocked("RESTART_HISTORY_INITIAL_UNVERIFIED");
   }
   const current=read(registry);
   if(current.ledgerId!==ledgerId||!current.used.has(expectedDecisionId))
    return blocked("RESTART_HISTORY_REGISTRY_MISMATCH");
   if(own(restartReceipt,"version")!==1||own(restartReceipt,"epochId")!==expectedEpochId||
    own(restartReceipt,"attemptId")!==expectedAttemptId||
    own(restartReceipt,"decisionId")!==expectedDecisionId||
    !equal(own(restartReceipt,"authenticationTag"),tag(authorityKey,expectedEpochId,
     expectedAttemptId,expectedDecisionId,current)))
    return blocked("RESTART_HISTORY_RECEIPT_UNVERIFIED");
   if(prior&&(current.revision<prior.revision||
    current.minimumRevision<prior.minimumRevision||
    [...prior.used].some(x=>!current.used.has(x))))
    return blocked("RESTART_HISTORY_ROLLBACK");
   prior=current;
   if(i===0)firstEpoch=expectedEpochId;
   lastEpoch=expectedEpochId;
  }
  return Object.freeze({state:"witness_decision_restart_history_observed_for_manual_review",
   ledgerId,decisionId:expectedDecisionId,observationCount:observations.length,
   firstEpochId:firstEpoch,lastEpochId:lastEpoch,lastRevision:prior.revision,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("RESTART_HISTORY_UNVERIFIED");}
}
