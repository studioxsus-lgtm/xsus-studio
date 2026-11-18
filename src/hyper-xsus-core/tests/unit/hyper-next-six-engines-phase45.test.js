import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessReviewRecovery} from "../../next-engines/orchestration/review-recovery-assessment.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const request={contractVersion:"1.0.0",requestId:"phase45",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase45",authorizationRef:"policy:test"}};
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase45-"));
 try{const filePath=join(dir,"journal.json"),store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request));return await fn(filePath,store);}
 finally{await rm(dir,{recursive:true,force:true});}};
const assess=(filePath,store,signal)=>assessReviewRecovery({filePath,store,
 requestId:"phase45",traceId:"trace-phase45",signal});
const interrupted=r=>expect(r).toMatchObject({state:"review_blocked",errorCode:"ASSESSMENT_INTERRUPTED",
 recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 45 — fail-closed recovery interruption",()=>{
 it("rejects an already aborted assessment without reading the store",async()=>fixture(async(path)=>{
  const controller=new AbortController();controller.abort();let reads=0;
  const result=await assess(path,{load:()=>{reads++;return null;}},controller.signal);
  interrupted(result);expect(reads).toBe(0);
 }));
 it("does not authorize a result when aborted while store.load is pending",async()=>fixture(async(path,store)=>{
  const controller=new AbortController();let entered;
  const started=new Promise(resolve=>{entered=resolve;});let resume;
  const held=new Promise(resolve=>{resume=resolve;});
  const injected={load:async()=>{entered();await held;return store.load();}};
  const assessment=assess(path,injected,controller.signal);
  await started;controller.abort();resume();
  interrupted(await assessment);
 }));
 it("does not authorize recovery if cancellation coincides with a store failure",async()=>fixture(async(path)=>{
  const controller=new AbortController();
  const result=await assess(path,{load:async()=>{controller.abort();throw Error("interrupted");}},controller.signal);
  interrupted(result);
 }));
 it("preserves normal manual-review behavior with a live signal",async()=>fixture(async(path,store)=>{
  const controller=new AbortController();
  const result=await assess(path,store,controller.signal);
  expect(result).toMatchObject({state:"recorded_for_manual_review",recoveryAuthorized:false,
   retrySafe:false,executionAuthorized:false});
 }));
 it("rejects invalid cancellation interfaces before reading the store",async()=>fixture(async(path)=>{
  let reads=0;
  await expect(assess(path,{load:()=>{reads++;return null;}},{aborted:false}))
   .rejects.toMatchObject({code:"INVALID_INPUT"});
  expect(reads).toBe(0);
 }));
 it("remains blocked if the journal changes before cancellation completes",async()=>fixture(async(path,store)=>{
  const controller=new AbortController();
  const injected={load:async()=>{const record=await store.load();
   await writeFile(path,"interrupted journal");controller.abort();return record;}};
  interrupted(await assess(path,injected,controller.signal));
 }));
});
