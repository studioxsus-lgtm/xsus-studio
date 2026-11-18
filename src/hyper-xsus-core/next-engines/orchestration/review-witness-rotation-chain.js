import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessKeyRotationHistory} from "./review-witness-key-rotation-history.js";

const denied=code=>Object.freeze({state:"witness_rotation_chain_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe chain record");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe chain field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const mac=(key,parts)=>createHmac("sha256",key).update(JSON.stringify(parts)).digest("hex");
const constantEq=(a,b)=>hex(a)&&hex(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
const record=(round,revision)=>{
 const observations=own(round,"observations"),attestations=own(round,"attestations");
 if(!Array.isArray(observations)||!Array.isArray(attestations)||
  observations.length!==attestations.length||observations.length<2||observations.length>64)
  throw Error("Unsafe chain round");
 const entries=[];
 for(let i=0;i<observations.length;i++){
  const od=Object.getOwnPropertyDescriptor(observations,String(i));
  const ad=Object.getOwnPropertyDescriptor(attestations,String(i));
  if(!od||!("value" in od)||!ad||!("value" in ad))throw Error("Sparse chain");
  const witnessId=own(od.value,"witnessId"),receipt=own(od.value,"receipt");
  const att=ad.value,keyId=own(att,"keyId");
  const ledgerTag=own(receipt,"authenticationTag");
  const witnessTag=own(att,"authenticationTag");
  if(!id(witnessId)||!id(keyId)||!hex(ledgerTag)||!hex(witnessTag))
   throw Error("Unsafe chain attestation");
  entries.push([witnessId,keyId,ledgerTag,witnessTag]);
 }
 entries.sort((a,b)=>a[0].localeCompare(b[0],"en"));
 if(entries.some((x,i)=>i>0&&x[0]===entries[i-1][0]))
  throw Error("Duplicate witness");
 const challenge=own(round,"challenge");
 if(!id(challenge))throw Error("Unsafe chain challenge");
 return [revision,challenge,entries];
};
/**
 * Phase 82: authenticated chain over fully verified rotation rounds.
 * The caller MUST retain a trusted head and round count independently;
 * without an external monotonic anchor, a fully re-signed truncated history
 * cannot be distinguished from a legitimate shorter history.
 * No disk/network writes, key rotation or recovery actions.
 */
export function createReviewWitnessRotationChain({
 rounds,ledgerId,ledgerKey,chainKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!id(ledgerId)||!keyOk(ledgerKey)||!keyOk(chainKey)||
  !seq(startingRevision)||!seq(minimumSequence))
  throw new EngineContractError("INVALID_INPUT","Invalid rotation chain configuration");
 const verified=inspectReviewWitnessKeyRotationHistory({
  rounds,ledgerId,ledgerKey,startingRevision,minimumSequence,
  requiredWitnesses,maxWitnesses,maxRounds});
 if(verified.state!=="witness_key_rotation_history_observed_for_manual_review")
  throw new EngineContractError("INVALID_INPUT","Unverified rotation history");
 try{
  const links=[];
  let previous="0".repeat(64);
  for(let i=0;i<rounds.length;i++){
   const d=Object.getOwnPropertyDescriptor(rounds,String(i));
   if(!d||!("value" in d))throw Error("Sparse chain");
   const revision=startingRevision+i;
   const tag=mac(chainKey,["XSUS_WITNESS_ROTATION_CHAIN_V1",ledgerId,
    startingRevision,i,previous,record(d.value,revision)]);
   links.push(Object.freeze({revision,previousTag:previous,authenticationTag:tag}));
   previous=tag;
  }
  return Object.freeze({version:1,ledgerId,startingRevision,roundCount:links.length,
   headTag:previous,links:Object.freeze(links)});
 }catch{
  throw new EngineContractError("INVALID_INPUT","Unverified rotation chain content");
 }
}
export function inspectReviewWitnessRotationChain({
 rounds,chain,trustedHeadTag,trustedRoundCount,ledgerId,ledgerKey,chainKey,
 startingRevision,minimumSequence=0,requiredWitnesses=2,maxWitnesses=16,
 maxRounds=32
}={}){
 if(!id(ledgerId)||!keyOk(ledgerKey)||!keyOk(chainKey)||
  !seq(startingRevision)||!seq(trustedRoundCount)||!hex(trustedHeadTag))
  throw new EngineContractError("INVALID_INPUT","Invalid rotation chain inspection configuration");
 try{
  const fresh=createReviewWitnessRotationChain({rounds,ledgerId,ledgerKey,chainKey,
   startingRevision,minimumSequence,requiredWitnesses,maxWitnesses,maxRounds});
  if(own(chain,"version")!==1||own(chain,"ledgerId")!==ledgerId||
   own(chain,"startingRevision")!==startingRevision||
   own(chain,"roundCount")!==fresh.roundCount||
   trustedRoundCount!==fresh.roundCount)
   return denied("ROTATION_CHAIN_LENGTH_OR_CONTEXT_MISMATCH");
  const links=own(chain,"links");
  if(!Array.isArray(links)||links.length!==fresh.links.length)
   return denied("ROTATION_CHAIN_LINKS_MISSING");
  for(let i=0;i<links.length;i++){
   const d=Object.getOwnPropertyDescriptor(links,String(i));
   if(!d||!("value" in d))return denied("ROTATION_CHAIN_LINK_UNVERIFIED");
   const link=d.value,expected=fresh.links[i];
   if(own(link,"revision")!==expected.revision||
    !constantEq(own(link,"previousTag"),expected.previousTag)||
    !constantEq(own(link,"authenticationTag"),expected.authenticationTag))
    return denied("ROTATION_CHAIN_LINK_TAMPERED");
  }
  if(!constantEq(own(chain,"headTag"),fresh.headTag)||
   !constantEq(trustedHeadTag,fresh.headTag))
   return denied("ROTATION_CHAIN_ANCHOR_MISMATCH");
  return Object.freeze({state:"witness_rotation_chain_observed_for_manual_review",
   ledgerId,startingRevision,roundCount:fresh.roundCount,headTag:fresh.headTag,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return denied("ROTATION_CHAIN_UNVERIFIED");}
}
