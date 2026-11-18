import {EngineContractError} from "../contracts.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const blocked=code=>Object.freeze({state:"anchor_conflict_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(value,name)=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid value");
 const descriptor=Object.getOwnPropertyDescriptor(value,name);
 if(!descriptor||!("value" in descriptor))throw Error("Unsafe property");
 return descriptor.value;
};
const validDigest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const validTag=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const validSequence=x=>Number.isSafeInteger(x)&&x>=0;
function verifyProposal(proposal,current,key){
 const state=own(proposal,"state");
 const expectedSequence=own(proposal,"expectedSequence");
 const expectedTag=own(proposal,"expectedTag");
 const nextAnchor=own(proposal,"nextAnchor");
 const sequence=own(nextAnchor,"sequence");
 const digest=own(nextAnchor,"registryDigest");
 const tag=own(nextAnchor,"authenticationTag");
 if(state!=="transition_proposed"||!validSequence(expectedSequence)||
  !validTag(expectedTag)||!validSequence(sequence)||!validDigest(digest)||
  !validTag(tag)||expectedSequence!==current.sequence||
  expectedTag!==current.tag||sequence!==current.sequence+1||
  digest===current.digest)return null;
 const verified=verifyReviewReplayRollbackAnchor({
  anchor:nextAnchor,registryDigest:digest,minimumSequence:sequence,key});
 if(verified.state!=="rollback_anchor_verified"||verified.sequence!==sequence)
  return null;
 return {sequence,digest,tag};
}
/**
 * Phase 66: read-only conflict classification for independently prepared
 * transition proposals. No CAS is performed here. An external trusted store
 * must serialize conditional writes and durably preserve monotonic state.
 */
export function assessReviewAnchorConcurrency({
 currentAnchor,currentDigest,proposals,key,minimumSequence=0,maxProposals=16
}={}){
 if(!Buffer.isBuffer(key)||key.length<32||key.length>4096||
  !validDigest(currentDigest)||!validSequence(minimumSequence)||
  !Number.isSafeInteger(maxProposals)||maxProposals<1||maxProposals>32||
  !Array.isArray(proposals)||proposals.length<1||proposals.length>maxProposals)
  throw new EngineContractError("INVALID_INPUT","Invalid anchor concurrency assessment");
 const verified=verifyReviewReplayRollbackAnchor({
  anchor:currentAnchor,registryDigest:currentDigest,minimumSequence,key});
 if(verified.state!=="rollback_anchor_verified")
  return blocked(verified.findings[0]??"ANCHOR_UNVERIFIED");
 if(verified.sequence===Number.MAX_SAFE_INTEGER)return blocked("SEQUENCE_EXHAUSTED");
 let current;
 try{
  current={sequence:verified.sequence,digest:currentDigest,
   tag:own(currentAnchor,"authenticationTag")};
 }catch{return blocked("ANCHOR_UNVERIFIED");}
 const unique=new Map();
 try{
  for(let index=0;index<proposals.length;index++){
   const descriptor=Object.getOwnPropertyDescriptor(proposals,String(index));
   if(!descriptor||!("value" in descriptor))return blocked("PROPOSAL_UNVERIFIED");
   const next=verifyProposal(descriptor.value,current,key);
   if(!next)return blocked("PROPOSAL_UNVERIFIED");
   unique.set(JSON.stringify([next.sequence,next.digest,next.tag]),next);
  }
 }catch{return blocked("PROPOSAL_UNVERIFIED");}
 if(unique.size!==1)return blocked("CONCURRENT_TRANSITION_CONFLICT");
 const next=[...unique.values()][0];
 return Object.freeze({state:"transition_consistent_for_manual_review",
  expectedSequence:current.sequence,proposedSequence:next.sequence,
  proposedDigest:next.digest,proposalCount:proposals.length,
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
}
