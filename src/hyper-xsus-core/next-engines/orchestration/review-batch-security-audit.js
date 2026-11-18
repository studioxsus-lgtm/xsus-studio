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
const safeIdentity=x=>typeof x==="string"&&x.length>0&&x.length<=256;
const allowedStates=new Set(["review_blocked","recorded_for_manual_review"]);
const allowedActions=new Set(["manual_review","manual_investigation"]);
const safeAssessment=x=>record(x)&&allowedStates.has(own(x,"state"))&&
 own(x,"recoveryAuthorized")===false&&own(x,"deletionAuthorized")===false&&
 own(x,"retrySafe")===false&&own(x,"executionAuthorized")===false&&
 own(x,"sideEffects")===false&&allowedActions.has(own(x,"nextAction"));
const sanitizedAssessment=x=>Object.freeze({
 state:own(x,"state"),
 ...(Object.getOwnPropertyDescriptor(x,"lockState")?{lockState:own(x,"lockState")}:{}),
 ...(Object.getOwnPropertyDescriptor(x,"journalState")?{journalState:own(x,"journalState")}:{}),
 ...(Object.getOwnPropertyDescriptor(x,"errorCode")?
  {errorCode:own(x,"errorCode")}:{}),
 recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
 executionAuthorized:false,sideEffects:false,nextAction:own(x,"nextAction")
});

/**
 * Phase 52: defensive audit of bounded, data-only batch results.
 * Accessors, proxies, exotic prototypes and unexpected fields fail closed.
 * Never grants execution, retries or journal recovery.
 */
export function auditReviewRecoveryBatch(batch){
 if(!record(batch))throw new EngineContractError("INVALID_INPUT","Invalid recovery batch");
 let entries;
 try{entries=own(batch,"results");
  if(!Array.isArray(entries)||entries.length>64)
   throw new EngineContractError("INVALID_INPUT","Invalid recovery results");
 }catch{throw new EngineContractError("INVALID_INPUT","Invalid recovery batch");}
 const findings=[];
 let headerSafe=false;
 try{headerSafe=own(batch,"state")==="manual_review_only"&&
  own(batch,"executionAuthorized")===false&&own(batch,"retrySafe")===false&&
  own(batch,"sideEffects")===false;}
 catch{headerSafe=false;}
 if(!headerSafe)findings.push("BATCH_INVARIANT_VIOLATION");
 const results=Array.from({length:entries.length},(_,index)=>{
  let requestId="",traceId="",assessment=BLOCKED,valid=false;
  try{
   const item=Object.getOwnPropertyDescriptor(entries,String(index));
   if(!item||!("value" in item)||!record(item.value))
    throw Error("Unsafe audit entry");
   const value=item.value;
   const id=own(value,"requestId"),trace=own(value,"traceId");
   if(safeIdentity(id))requestId=id;
   if(safeIdentity(trace))traceId=trace;
   const candidate=own(value,"assessment");
   valid=safeIdentity(id)&&safeIdentity(trace)&&safeAssessment(candidate);
   if(valid&&headerSafe)assessment=sanitizedAssessment(candidate);
  }catch{valid=false;}
  if(!valid)findings.push("REQUEST_INVARIANT_VIOLATION");
  return Object.freeze({index,requestId,traceId,assessment});
 });
 return Object.freeze({state:findings.length===0?"audit_passed":"audit_blocked",
  executionAuthorized:false,recoveryAuthorized:false,retrySafe:false,
  sideEffects:false,findings:Object.freeze([...new Set(findings)]),
  results:Object.freeze(results)});
}
export async function assessAndAuditReviewRecoveryBatch(options){
 const batch=await assessConcurrentReviewRecovery(options);
 return auditReviewRecoveryBatch(batch);
}
