import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessConcurrentReviewRecovery} from "../../next-engines/orchestration/review-concurrent-assessment.js";

const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase50-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const requests=Array.from({length:4},(_,i)=>({requestId:"r"+i,traceId:"t"+i}));
const run=(filePath,store,options={})=>assessConcurrentReviewRecovery({
 filePath,store,requests,maxConcurrent:1,...options});
describe("Hyper phase 50 — batch deadline queue admission",()=>{
 it("blocks queued requests after a batch deadline without killing active reads",async()=>fixture(async filePath=>{
  let calls=0;
  const store={load:async()=>{calls++;
   await new Promise(resolve=>setTimeout(resolve,90));return null;}};
  const result=await run(filePath,store,{batchTimeoutMs:20});
  expect(calls).toBe(1);
  expect(result.results[0].assessment.errorCode).not.toBe("BATCH_DEADLINE_EXCEEDED");
  for(const item of result.results.slice(1))
   expect(item.assessment).toMatchObject({state:"review_blocked",
    errorCode:"BATCH_DEADLINE_EXCEEDED",retrySafe:false,
    executionAuthorized:false,recoveryAuthorized:false,sideEffects:false});
 }));
 it("does not block live requests before a generous deadline",async()=>fixture(async filePath=>{
  let calls=0;
  const result=await run(filePath,{load:async()=>{calls++;return null;}},{
   batchTimeoutMs:5000});
  expect(calls).toBe(4);
  expect(result.results.every(x=>x.assessment.errorCode!=="BATCH_DEADLINE_EXCEEDED")).toBe(true);
 }));
 it("preserves result identity and order for skipped requests",async()=>fixture(async filePath=>{
  const store={load:async()=>{await new Promise(resolve=>setTimeout(resolve,80));return null;}};
  const result=await run(filePath,store,{batchTimeoutMs:10});
  expect(result.results.map(x=>x.requestId)).toEqual(["r0","r1","r2","r3"]);
  expect(result).toMatchObject({state:"manual_review_only",executionAuthorized:false,
   retrySafe:false,sideEffects:false});
 }));
 it("rejects invalid batch deadlines before touching storage",async()=>fixture(async filePath=>{
  let calls=0;
  await expect(run(filePath,{load:async()=>{calls++;return null;}},{
   batchTimeoutMs:0})).rejects.toMatchObject({code:"INVALID_INPUT"});
  await expect(run(filePath,{load:async()=>{calls++;return null;}},{
   batchTimeoutMs:60001})).rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(calls).toBe(0);
 }));
});
