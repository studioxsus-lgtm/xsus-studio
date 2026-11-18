import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessConcurrentReviewRecovery} from "../../next-engines/orchestration/review-concurrent-assessment.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const request={contractVersion:"1.0.0",requestId:"phase46",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase46",authorizationRef:"policy:test"}};
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase46-"));
 try{const filePath=join(dir,"journal.json"),store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request));return await fn(filePath,store);}
 finally{await rm(dir,{recursive:true,force:true});}};
const batch=(filePath,store,requests,options={})=>assessConcurrentReviewRecovery({
 filePath,store,requests,...options});
const valid={requestId:"phase46",traceId:"trace-phase46"};
const other={requestId:"different",traceId:"trace-different"};
const denied=result=>expect(result).toMatchObject({executionAuthorized:false,retrySafe:false,sideEffects:false});
describe("Hyper phase 46 — independent concurrent recovery assessments",()=>{
 it("does not transfer verified recovery to a different request",async()=>fixture(async(path,store)=>{
  const result=await batch(path,store,[valid,other]);
  expect(result.results).toHaveLength(2);
  expect(result.results[0].assessment.state).toBe("recorded_for_manual_review");
  expect(result.results[1].assessment.state).toBe("review_blocked");
  for(const item of result.results)denied(item.assessment);
  denied(result);
 }));
 it("retains input order and identity across parallel checks",async()=>fixture(async(path,store)=>{
  const result=await batch(path,store,[other,valid,other]);
  expect(result.results.map(x=>x.requestId)).toEqual(["different","phase46","different"]);
  expect(result.results[1].assessment.state).toBe("recorded_for_manual_review");
  denied(result);
 }));
 it("isolates one aborted request from another",async()=>fixture(async(path,store)=>{
  const controller=new AbortController();controller.abort();
  const result=await batch(path,store,[{...valid,signal:controller.signal},valid]);
  expect(result.results[0].assessment.errorCode).toBe("ASSESSMENT_INTERRUPTED");
  expect(result.results[1].assessment.state).toBe("recorded_for_manual_review");
  denied(result);
 }));
 it("contains a rejected assessment without rejecting the whole batch",async()=>fixture(async(path,store)=>{
  const result=await batch(path,store,[{...valid,signal:{aborted:false}},valid]);
  expect(result.results[0].assessment.errorCode).toBe("ASSESSMENT_UNVERIFIED");
  expect(result.results[1].assessment.state).toBe("recorded_for_manual_review");
  denied(result);
 }));
 it("rejects unbounded batches before any store read",async()=>fixture(async(path)=>{
  let reads=0;const store={load:async()=>{reads++;return null;}};
  await expect(batch(path,store,Array.from({length:17},()=>valid)))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(reads).toBe(0);
 }));
 it("rejects malformed request identity before any store read",async()=>fixture(async(path)=>{
  let reads=0;const store={load:async()=>{reads++;return null;}};
  await expect(batch(path,store,[valid,{requestId:"invalid"}]))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(reads).toBe(0);
 }));
});
