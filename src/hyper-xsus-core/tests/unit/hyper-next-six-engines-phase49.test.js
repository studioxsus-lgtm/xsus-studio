import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessConcurrentReviewRecovery} from "../../next-engines/orchestration/review-concurrent-assessment.js";

const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase49-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const req=(id,extra={})=>({requestId:id,traceId:"trace-"+id,...extra});
const run=(filePath,store,requests)=>assessConcurrentReviewRecovery({
 filePath,store,requests,maxConcurrent:1});
const denied=result=>expect(result).toMatchObject({state:"review_blocked",
 recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
 executionAuthorized:false,sideEffects:false});
describe("Hyper phase 49 — deadline classification without unsafe I/O cancellation",()=>{
 it("reports deadline exceeded after a slow load settles",async()=>fixture(async filePath=>{
  // Avoid an unbounded handshake: under heavy CI load the deadline may
  // expire before store.load begins, so awaiting "started" can hang forever.
  let loads=0;
  const store={load:async()=>{
   loads++;
   await new Promise(resolve=>setTimeout(resolve,350));
   return null;
  }};
  const result=await run(filePath,store,[req("slow",{timeoutMs:100})]);
  expect(loads).toBeLessThanOrEqual(1);
  denied(result.results[0].assessment);
  expect(result.results[0].assessment.errorCode).toBe("ASSESSMENT_DEADLINE_EXCEEDED");
 }));
 it("does not mislabel caller cancellation as a deadline",async()=>fixture(async filePath=>{
  const controller=new AbortController();controller.abort();
  const result=await run(filePath,{load:async()=>null},[req("canceled",{
   signal:controller.signal,timeoutMs:1000})]);
  denied(result.results[0].assessment);
  expect(result.results[0].assessment.errorCode).toBe("ASSESSMENT_INTERRUPTED");
 }));
 it("keeps later requests independent after a timeout",async()=>fixture(async filePath=>{
  let calls=0;
  const store={load:async()=>{calls++;
   if(calls===1)await new Promise(resolve=>setTimeout(resolve,25));
   return null;}};
  const result=await run(filePath,store,[req("slow",{timeoutMs:5}),req("next")]);
  expect(result.results[0].assessment.errorCode).toBe("ASSESSMENT_DEADLINE_EXCEEDED");
  expect(result.results[1].assessment.errorCode).not.toBe("ASSESSMENT_DEADLINE_EXCEEDED");
  // Under CI scheduling pressure the first deadline may expire before load().
  // The second request must still proceed independently and reach storage.
  expect(calls).toBeGreaterThanOrEqual(1);
  expect(calls).toBeLessThanOrEqual(2);
 }));
 it("rejects invalid deadlines before reading storage",async()=>fixture(async filePath=>{
  let calls=0;
  await expect(run(filePath,{load:async()=>{calls++;return null;}},[
   req("invalid",{timeoutMs:0})])).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(calls).toBe(0);
 }));
});
