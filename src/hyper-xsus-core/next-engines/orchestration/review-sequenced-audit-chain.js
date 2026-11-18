import {createHash} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {compareReviewAuditContinuity} from "./review-audit-continuity.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const safeId=value=>typeof value==="string"&&value.length>0&&value.length<=128;
/**
 * Phase 58: caller-supplied sequence and observation IDs allow detection of
 * gaps, reordering and repeated IDs. Sequence metadata is NOT authenticated:
 * a malicious producer can rewrite it. Identical observations are allowed.
 */
export function verifySequencedReviewAuditChain({observations,maxObservations=16}={}){
 if(!Array.isArray(observations)||observations.length<2||
  !Number.isSafeInteger(maxObservations)||maxObservations<2||
  maxObservations>32||observations.length>maxObservations)
  throw new EngineContractError("INVALID_INPUT","Invalid sequenced audit chain");
 const findings=new Set(),links=[];
 const ids=new Set();
 let previousHash="0".repeat(64);
 let previous=null;
 for(let i=0;i<observations.length;i++){
  let current=null;
  try{
   const entry=observations[i];
   if(entry===null||typeof entry!=="object"||Array.isArray(entry))
    throw Error("Invalid entry");
   const sequence=Object.getOwnPropertyDescriptor(entry,"sequence");
   const observationId=Object.getOwnPropertyDescriptor(entry,"observationId");
   const snapshot=Object.getOwnPropertyDescriptor(entry,"snapshot");
   if(!sequence||!("value" in sequence)||!observationId||
      !("value" in observationId)||!snapshot||!("value" in snapshot))
    throw Error("Unsafe entry");
   current={sequence:sequence.value,observationId:observationId.value,
    snapshot:snapshot.value};
   if(!Number.isSafeInteger(current.sequence)||current.sequence<0||
      !safeId(current.observationId))throw Error("Invalid metadata");
   if(ids.has(current.observationId))findings.add("OBSERVATION_REPLAYED");
   ids.add(current.observationId);
   if(previous!==null&&current.sequence!==previous.sequence+1)
    findings.add("SEQUENCE_GAP_OR_REORDER");
  }catch{
   findings.add("OBSERVATION_UNVERIFIED");
  }
  if(i>0){
   let comparison=null;
   try{
    if(previous&&current)
     comparison=compareReviewAuditContinuity({
      before:previous.snapshot,after:current.snapshot});
   }catch{comparison=null;}
   if(comparison?.state!=="continuity_observed")
    findings.add("CHAIN_LINK_UNVERIFIED");
   const linkHash=hash([i,previousHash,previous?.sequence??null,
    current?.sequence??null,previous?.observationId??null,
    current?.observationId??null,comparison?.beforeFingerprint??null,
    comparison?.afterFingerprint??null,comparison?.state??null]);
   links.push(Object.freeze({index:i,previousHash,linkHash,
    state:comparison?.state==="continuity_observed"?
     "continuity_observed":"continuity_blocked",
    recoveryAuthorized:false,executionAuthorized:false,retrySafe:false}));
   previousHash=linkHash;
  }
  previous=current;
 }
 const passed=findings.size===0;
 return Object.freeze({state:passed?"chain_observed":"chain_blocked",
  headFingerprint:previousHash,findings:Object.freeze([...findings]),
  links:Object.freeze(links),recoveryAuthorized:false,deletionAuthorized:false,
  retrySafe:false,executionAuthorized:false,sideEffects:false,
  nextAction:passed?"manual_review":"manual_investigation"});
}
