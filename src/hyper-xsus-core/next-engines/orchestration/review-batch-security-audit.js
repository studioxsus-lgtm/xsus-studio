import {EngineContractError} from "../contracts.js";
import {assessConcurrentReviewRecovery} from "./review-concurrent-assessment.js";

const BLOCKED=Object.freeze({
 state:"review_blocked",lockState:"unverified",journalState:"unverified",
 errorCode:"SECURITY_AUDIT_UNVERIFIED",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"
});
const safe=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const safeAssessment=x=>safe(x)&&
 (x.state==="review_blocked"||x.state==="recorded_for_manual_review")&&
 x.recoveryAuthorized===false&&x.deletionAuthorized===false&&
 x.retrySafe===false&&x.executionAuthorized===false&&x.sideEffects===false&&
 (x.nextAction==="manual_review"||x.nextAction==="manual_investigation");

/**
 * Phase 51: defensive audit of batch recovery outputs. It cannot establish
 * atomic filesystem consistency and never grants authorization.
 */
export function auditReviewRecoveryBatch(batch){
 if(!safe(batch)||!Array.isArray(batch.results))
  throw new EngineContractError("INVALID_INPUT","Invalid recovery batch");
 const findings=[];
 const headerSafe=batch.state==="manual_review_only"&&
  batch.executionAuthorized===false&&batch.retrySafe===false&&
  batch.sideEffects===false;
 if(!headerSafe)findings.push("BATCH_INVARIANT_VIOLATION");
 const results=batch.results.map((item,index)=>{
  const valid=safe(item)&&typeof item.requestId==="string"&&
   item.requestId.length>0&&typeof item.traceId==="string"&&
   item.traceId.length>0&&safeAssessment(item.assessment);
  if(!valid)findings.push("REQUEST_INVARIANT_VIOLATION");
  return Object.freeze({index,requestId:typeof item?.requestId==="string"?item.requestId:"",
   traceId:typeof item?.traceId==="string"?item.traceId:"",
   assessment:valid&&headerSafe?item.assessment:BLOCKED});
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
