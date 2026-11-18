import {EngineContractError} from "../contracts.js";
import {inspectReviewWitnessKeyRotationContinuity} from "./review-witness-key-rotation-continuity.js";

const blocked=code=>Object.freeze({state:"witness_key_rotation_history_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe rotation history");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe rotation field");
 return d.value;
};
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
/**
 * Phase 81: read-only multi-rotation history inspection. Each adjacent
 * transition is checked by Phase 80, then all witness key IDs and key bytes
 * are checked for historical reuse. All challenges must be distinct.
 * Caller must provide a complete, trusted and fresh history. This does not
 * authenticate registry provenance or guarantee global fork absence.
 */
export function inspectReviewWitnessKeyRotationHistory({
 rounds,ledgerId,ledgerKey,startingRevision,minimumSequence=0,
 requiredWitnesses=2,maxWitnesses=16,maxRounds=32
}={}){
 if(!id(ledgerId)||!keyOk(ledgerKey)||!seq(startingRevision)||
  !seq(minimumSequence)||!seq(requiredWitnesses)||requiredWitnesses<2||
  !seq(maxWitnesses)||maxWitnesses<requiredWitnesses||maxWitnesses>64||
  !seq(maxRounds)||maxRounds<3||maxRounds>128||
  !Array.isArray(rounds)||rounds.length<3||rounds.length>maxRounds||
  startingRevision>Number.MAX_SAFE_INTEGER-(rounds.length-1))
  throw new EngineContractError("INVALID_INPUT","Invalid witness rotation history configuration");
 try{
  const challenges=new Set(),historicalKeys=new Map();
  let lastSequence=-1;
  for(let i=0;i<rounds.length;i++){
   const d=Object.getOwnPropertyDescriptor(rounds,String(i));
   if(!d||!("value" in d))return blocked("ROTATION_HISTORY_UNVERIFIED");
   const round=d.value,challenge=own(round,"challenge");
   if(!id(challenge)||challenges.has(challenge))
    return blocked("ROTATION_HISTORY_CHALLENGE_REPLAY");
   challenges.add(challenge);
   const observations=own(round,"observations");
   const attestations=own(round,"attestations");
   const registry=own(round,"keyRegistry");
   if(!Array.isArray(observations)||!Array.isArray(attestations)||
    observations.length!==attestations.length||
    observations.length<requiredWitnesses||observations.length>maxWitnesses)
    return blocked("ROTATION_HISTORY_WITNESS_SET_INVALID");
   const currentSequence=startingRevision+i;
   const witnessIds=new Set();
   let roundFloor;
   for(let j=0;j<observations.length;j++){
    const od=Object.getOwnPropertyDescriptor(observations,String(j));
    const ad=Object.getOwnPropertyDescriptor(attestations,String(j));
    if(!od||!("value" in od)||!ad||!("value" in ad))
     return blocked("ROTATION_HISTORY_UNVERIFIED");
    const witnessId=own(od.value,"witnessId"),keyId=own(ad.value,"keyId");
    if(!id(witnessId)||!id(keyId)||witnessIds.has(witnessId))
     return blocked("ROTATION_HISTORY_WITNESS_SET_INVALID");
    witnessIds.add(witnessId);
    const ledger=own(od.value,"ledger");
    const floor=own(ledger,"minimumSequence");
    if(!seq(floor)||floor<minimumSequence||
     (roundFloor!==undefined&&floor!==roundFloor))
     return blocked("ROTATION_HISTORY_SEQUENCE_UNVERIFIED");
    roundFloor=floor;
    const record=own(own(registry,witnessId),keyId);
    const key=own(record,"key");
    if(!keyOk(key))return blocked("ROTATION_HISTORY_KEY_UNVERIFIED");
    const used=historicalKeys.get(witnessId)??{ids:new Set(),keys:[]};
    if(used.ids.has(keyId)||used.keys.some(k=>k.equals(key)))
     return blocked("ROTATION_HISTORY_KEY_REUSED");
    used.ids.add(keyId);used.keys.push(Buffer.from(key));
    historicalKeys.set(witnessId,used);
   }
   if(i>0){
    if(roundFloor<=lastSequence)
     return blocked("ROTATION_HISTORY_SEQUENCE_ROLLBACK");
    const previous=Object.getOwnPropertyDescriptor(rounds,String(i-1)).value;
    const result=inspectReviewWitnessKeyRotationContinuity({
     before:previous,after:round,ledgerId,ledgerKey,
     beforeRevision:currentSequence-1,afterRevision:currentSequence,
     minimumSequence,requiredWitnesses,maxWitnesses});
    if(result.state!=="witness_key_rotation_continuity_observed_for_manual_review")
     return blocked(result.findings?.[0]??"ROTATION_HISTORY_TRANSITION_UNVERIFIED");
   }
   lastSequence=roundFloor;
  }
  return Object.freeze({state:"witness_key_rotation_history_observed_for_manual_review",
   ledgerId,startingRevision,endingRevision:startingRevision+rounds.length-1,
   roundCount:rounds.length,witnessCount:historicalKeys.size,
   recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
   executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }catch{return blocked("ROTATION_HISTORY_UNVERIFIED");}
}
