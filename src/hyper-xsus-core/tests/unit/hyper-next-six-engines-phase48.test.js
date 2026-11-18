import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessConcurrentReviewRecovery} from "../../next-engines/orchestration/review-concurrent-assessment.js";

const fixture=async fn=>{
 const dir=await mkdtemp(join(tmpdir(),"xsus-phase48-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
};
const request=(i,signal)=>({requestId:"r"+i,traceId:"t"+i,signal});
const denied=result=>expect(result).toMatchObject({state:"review_blocked",
 errorCode:"ASSESSMENT_INTERRUPTED",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 48 — queued cancellation before assessment",()=>{
 it("skips a queued request canceled while another load is pending",async()=>fixture(async filePath=>{
  let started,release,loads=0;
  const entered=new Promise(resolve=>{started=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  const controller=new AbortController();
  const store={load:async()=>{loads++;started();await gate;return null;}};
  const pending=assessConcurrentReviewRecovery({filePath,store,maxConcurrent:1,
   requests:[request(0),request(1,controller.signal)]});
  await entered;controller.abort();release();
  const result=await pending;
  expect(loads).toBe(1);
  denied(result.results[1].assessment);
  expect(result.results[0].assessment.state).toBe("review_blocked");
 }));
 it("does not skip a live queued request",async()=>fixture(async filePath=>{
  let loads=0;
  const store={load:async()=>{loads++;return null;}};
  const result=await assessConcurrentReviewRecovery({filePath,store,maxConcurrent:1,
   requests:[request(0),request(1)]});
  expect(loads).toBe(2);
  expect(result.results.map(x=>x.requestId)).toEqual(["r0","r1"]);
 }));
 it("skips multiple canceled requests without shifting output identities",async()=>fixture(async filePath=>{
  const controller=new AbortController();controller.abort();let loads=0;
  const result=await assessConcurrentReviewRecovery({filePath,
   store:{load:async()=>{loads++;return null;}},maxConcurrent:2,
   requests:[request(0,controller.signal),request(1),request(2,controller.signal)]});
  expect(loads).toBe(1);
  expect(result.results.map(x=>x.requestId)).toEqual(["r0","r1","r2"]);
  denied(result.results[0].assessment);
  denied(result.results[2].assessment);
 }));
 it("does not treat cancellation as authorization for the entire batch",async()=>fixture(async filePath=>{
  const controller=new AbortController();controller.abort();
  const result=await assessConcurrentReviewRecovery({filePath,
   store:{load:async()=>null},requests:[request(0,controller.signal)]});
  expect(result).toMatchObject({state:"manual_review_only",executionAuthorized:false,
   retrySafe:false,sideEffects:false});
  denied(result.results[0].assessment);
 }));
});
