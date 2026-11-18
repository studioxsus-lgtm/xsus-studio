import {EngineContractError} from "../contracts.js";
import {assessConcurrentReviewRecovery} from "./review-concurrent-assessment.js";

const BLOCKED=Object.freeze({
 state:"review_blocked",lockState:"unverified",journalState:"unverified",
 errorCode:"SECURITY_AUDIT_UNVERIFIED",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"
});
const own=(obj,key)=>{
 const descriptor=Object.getOwnPropertyDescriptor(obj,key);
 if(!descriptor||!("value" in descriptor))
  throw new EngineContractError("INVALID_INPUT","Unsafe audit property");
 return descriptor.value;
};
const record=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const stableOwn=(obj,key)=>{
 const first=own(obj,key),second=own(obj,key);
 if(!Object.is(first,second))throw new EngineContractError("INVALID_INPUT","Unstable audit property");
 return first;
};
const safeIdentity=x=>typeof x==="string"&&x.length>0&&x.length<=256;
const allowedStates=new Set(["review_blocked","recorded_for_manual_review"]);
const allowedActions=new Set(["manual_review","manual_investigation"]);
// Phase 54: optional metadata is bounded, scalar and never copied by reference.
const optionalText=(x,key)=>{
 const descriptor=Object.getOwnPropertyDescriptor(x,key);
 if(!descriptor)return undefined;
 const value=stableOwn(x,key);
 if(typeof value!=="string"||value.length>128)
  throw new EngineContractError("INVALID_INPUT","Invalid audit metadata");
 return value;
};
const safeAssessment=x=>{
 if(!record(x))return false;
 const state=stableOwn(x,"state"),action=stableOwn(x,"nextAction");
 if(!allowedStates.has(state)||!allowedActions.has(action)||
  (state==="recorded_for_manual_review"&&action!=="manual_review")||
  (state==="review_blocked"&&action!=="manual_investigation"))
  return false;
 if(stableOwn(x,"recoveryAuthorized")!==false||
  stableOwn(x,"deletionAuthorized")!==false||
  stableOwn(x,"retrySafe")!==false||
  stableOwn(x,"executionAuthorized")!==false||
  stableOwn(x,"sideEffects")!==false)return false;
 for(const key of ["lockState","journalState","errorCode"])optionalText(x,key);
 return true;
};
const sanitizedAssessment=x=>{
 const lockState=optionalText(x,"lockState");
 const journalState=optionalText(x,"journalState");
 const errorCode=optionalText(x,"errorCode");
 return Object.freeze({
  state:stableOwn(x,"state"),
  ...(lockState===undefined?{}:{lockState}),
  ...(journalState===undefined?{}:{journalState}),
  ...(errorCode===undefined?{}:{errorCode}),
  recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
  executionAuthorized:false,sideEffects:false,nextAction:stableOwn(x,"nextAction")
 });
};
/**
 * Phase 52: defensive audit of bounded, data-only batch results.
 * Accessors, proxies, exotic prototypes and unexpected fields fail closed.
 * Never grants execution, retries or journal recovery.
 */
export function auditReviewRecoveryBatch(batch){
 try{if(!record(batch))throw Error("Invalid batch");}
 catch{throw new EngineContractError("INVALID_INPUT","Invalid recovery batch");}
 let entries;
 try{entries=stableOwn(batch,"results");
  if(!Array.isArray(entries)||entries.length>64||entries.length<0)
   throw new EngineContractError("INVALID_INPUT","Invalid recovery results");
 }catch{throw new EngineContractError("INVALID_INPUT","Invalid recovery batch");}
 const findings=[];
 let headerSafe=false;
 try{headerSafe=stableOwn(batch,"state")==="manual_review_only"&&
  stableOwn(batch,"executionAuthorized")===false&&stableOwn(batch,"retrySafe")===false&&
  stableOwn(batch,"sideEffects")===false;}
 catch{headerSafe=false;}
 if(!headerSafe)findings.push("BATCH_INVARIANT_VIOLATION");
 const length=entries.length;
 const results=Array.from({length},(_,index)=>{
  let requestId="",traceId="",assessment=BLOCKED,valid=false;
  try{
   const item=Object.getOwnPropertyDescriptor(entries,String(index));
   if(!item||!("value" in item)||!record(item.value))
    throw Error("Unsafe audit entry");
   const value=item.value;
   const id=stableOwn(value,"requestId"),trace=stableOwn(value,"traceId");
   if(safeIdentity(id))requestId=id;
   if(safeIdentity(trace))traceId=trace;
   const candidate=stableOwn(value,"assessment");
   valid=safeIdentity(id)&&safeIdentity(trace)&&safeAssessment(candidate);
   if(valid&&headerSafe)assessment=sanitizedAssessment(candidate);
  }catch{valid=false;}
  if(!valid)findings.push("REQUEST_INVARIANT_VIOLATION");
  return Object.freeze({index,requestId,traceId,assessment});
 });
 // Phase 55: repeated request/trace pairs are ambiguous during reconciliation.
 // Block every occurrence, not just the later duplicate.
 const identities=new Map();
 for(let i=0;i<results.length;i++){
  const {requestId,traceId}=results[i];
  if(!requestId||!traceId)continue;
  const key=JSON.stringify([requestId,traceId]);
  const previous=identities.get(key);
  if(previous===undefined)identities.set(key,i);
  else{
   findings.push("DUPLICATE_REQUEST_IDENTITY");
   results[previous]=Object.freeze({...results[previous],assessment:BLOCKED});
   results[i]=Object.freeze({...results[i],assessment:BLOCKED});
  }
 }
 // A hostile Proxy can mutate its view while entries are inspected.
 // Re-check the array shape; any detected mutation invalidates the batch.
 let stable=true;
 try{
  stable=entries.length===length&&stableOwn(batch,"results")===entries;
  for(let i=0;i<length&&stable;i++){
   const descriptor=Object.getOwnPropertyDescriptor(entries,String(i));
   stable=!!descriptor&&"value" in descriptor&&record(descriptor.value)&&
    stableOwn(descriptor.value,"requestId")===results[i].requestId&&
    stableOwn(descriptor.value,"traceId")===results[i].traceId;
  }
 }catch{stable=false;}
 if(!stable){
  findings.push("BATCH_MUTATED_DURING_AUDIT");
  for(let i=0;i<results.length;i++)results[i]=Object.freeze({...results[i],assessment:BLOCKED});
 }
 return Object.freeze({state:findings.length===0?"audit_passed":"audit_blocked",
  executionAuthorized:false,recoveryAuthorized:false,retrySafe:false,
  sideEffects:false,findings:Object.freeze([...new Set(findings)]),
  results:Object.freeze(results)});
}
export async function assessAndAuditReviewRecoveryBatch(options){
 const batch=await assessConcurrentReviewRecovery(options);
 return auditReviewRecoveryBatch(batch);
}
