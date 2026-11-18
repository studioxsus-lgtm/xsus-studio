import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessConcurrentReviewRecovery} from "../../next-engines/orchestration/review-concurrent-assessment.js";
const requests=Array.from({length:8},(_,i)=>({requestId:"r"+i,traceId:"t"+i}));
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase47-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const batch=(filePath,store,options={})=>assessConcurrentReviewRecovery({filePath,store,requests,...options});
describe("Hyper phase 47 — bounded in-flight recovery assessments",()=>{
 it("limits simultaneous store loads to two",async()=>fixture(async filePath=>{
  let active=0,peak=0;
  const store={load:async()=>{active++;peak=Math.max(peak,active);
   await new Promise(resolve=>setTimeout(resolve,10));active--;return null;}};
  const result=await batch(filePath,store,{maxConcurrent:2});
  expect(peak).toBeLessThanOrEqual(2);
  expect(peak).toBeGreaterThan(0);
  expect(result.results).toHaveLength(8);
 }));
 it("preserves result order under variable read durations",async()=>fixture(async filePath=>{
  let count=0;
  const store={load:async()=>{const index=count++;
   await new Promise(resolve=>setTimeout(resolve,index%2?1:8));return null;}};
  const result=await batch(filePath,store,{maxConcurrent:3});
  expect(result.results.map(x=>x.requestId)).toEqual(requests.map(x=>x.requestId));
  expect(result.results.every(x=>x.assessment.executionAuthorized===false)).toBe(true);
 }));
 it("contains a rejected worker read and continues the batch",async()=>fixture(async filePath=>{
  let count=0;
  const store={load:async()=>{if(count++===0)throw Error("temporary failure");return null;}};
  const result=await batch(filePath,store,{maxConcurrent:1});
  expect(result.results).toHaveLength(8);
  expect(result.results[0].assessment.state).toBe("review_blocked");
  expect(result.results.every(x=>x.assessment.retrySafe===false)).toBe(true);
 }));
 it("rejects zero concurrency before touching storage",async()=>fixture(async filePath=>{
  let calls=0;
  await expect(batch(filePath,{load:()=>{calls++;return null;}},{maxConcurrent:0}))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(calls).toBe(0);
 }));
 it("rejects excessive concurrency before touching storage",async()=>fixture(async filePath=>{
  let calls=0;
  await expect(batch(filePath,{load:()=>{calls++;return null;}},{maxConcurrent:17}))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(calls).toBe(0);
 }));
});
