import {describe,it,expect} from "vitest";
import {auditReviewRecoveryBatch} from "../../next-engines/orchestration/review-batch-security-audit.js";
const assessment=()=>({state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
const entry=a=>({requestId:"r",traceId:"t",assessment:a});
const batch=results=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results});
describe("Hyper phase 53 — hostile proxies and mutation checks",()=>{
 it("fails closed when a proxy descriptor trap throws",()=>{
  const hostile=new Proxy(assessment(),{getOwnPropertyDescriptor(){throw Error("trap");}});
  const result=auditReviewRecoveryBatch(batch([entry(hostile)]));
  expect(result.state).toBe("audit_blocked");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("rejects a proxy that changes a security field between reads",()=>{
  const source=assessment();let reads=0;
  const hostile=new Proxy(source,{getOwnPropertyDescriptor(target,key){
   if(key==="executionAuthorized"){
    reads++;
    return {configurable:true,enumerable:true,writable:true,value:reads===1?false:true};
   }
   return Reflect.getOwnPropertyDescriptor(target,key);
  }});
  const result=auditReviewRecoveryBatch(batch([entry(hostile)]));
  expect(result.state).toBe("audit_blocked");
  expect(result.results[0].assessment.retrySafe).toBe(false);
 });
 it("rejects mutation of request identity during the audit",()=>{
  const item=entry(assessment());let reads=0;
  const hostile=new Proxy(item,{getOwnPropertyDescriptor(target,key){
   if(key==="requestId"){
    reads++;
    return {configurable:true,enumerable:true,writable:true,value:reads<=2?"r":"changed"};
   }
   return Reflect.getOwnPropertyDescriptor(target,key);
  }});
  const result=auditReviewRecoveryBatch(batch([hostile]));
  expect(result.state).toBe("audit_blocked");
  expect(result.findings).toContain("BATCH_MUTATED_DURING_AUDIT");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("accepts stable data-only results",()=>{
  const result=auditReviewRecoveryBatch(batch([entry(assessment())]));
  expect(result.state).toBe("audit_passed");
  expect(result.results[0].assessment.executionAuthorized).toBe(false);
 });
 it("rejects a top-level proxy that throws on prototype inspection",()=>{
  const hostile=new Proxy(batch([]),{getPrototypeOf(){throw Error("trap");}});
  expect(()=>auditReviewRecoveryBatch(hostile)).toThrow();
 });
});
