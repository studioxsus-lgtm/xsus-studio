import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,unlink,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {assessReviewRecovery} from "../../next-engines/orchestration/review-recovery-assessment.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const req=()=>({contractVersion:"1.0.0",requestId:"phase42",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase42",authorizationRef:"policy:test"}});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase42-"));
 try{const filePath=join(dir,"journal.json"),store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  return await fn(filePath,store);}
 finally{await rm(dir,{recursive:true,force:true});}};
const assess=(filePath,store)=>assessReviewRecovery({filePath,store,requestId:"phase42",traceId:"trace-phase42"});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false});
const lockData=()=>JSON.stringify({pid:process.pid,token:randomUUID()});
describe("Hyper phase 42 — lock transition detection during recovery assessment",()=>{
 it("blocks if a lock appears during journal reconciliation",async()=>fixture(async(filePath,store)=>{
  const injected={load:async()=>{const snapshot=await store.load();await writeFile(filePath+".lock",lockData());return snapshot;}};
  const result=await assess(filePath,injected);
  expect(result).toMatchObject({state:"review_blocked",lockState:"changed_during_assessment",
   journalState:"recorded_for_manual_review",nextAction:"manual_investigation"});
  denied(result);
 }));
 it("blocks if a lock disappears during journal reconciliation",async()=>fixture(async(filePath,store)=>{
  await writeFile(filePath+".lock",lockData());
  const injected={load:async()=>{await unlink(filePath+".lock");return store.load();}};
  const result=await assess(filePath,injected);
  expect(result.lockState).toBe("changed_during_assessment");
  denied(result);
 }));
 it("retains manual review for stable verified journal with no observed lock",async()=>fixture(async(filePath,store)=>{
  const result=await assess(filePath,store);
  expect(result).toMatchObject({state:"recorded_for_manual_review",lockState:"not_observed",
   nextAction:"manual_review"});
  denied(result);
 }));
 it("never authorizes recovery for a stable unverified lock",async()=>fixture(async(filePath,store)=>{
  await writeFile(filePath+".lock","invalid");
  const result=await assess(filePath,{load:()=>store.load()});
  expect(result).toMatchObject({state:"review_blocked",lockState:"unverifiable_lock"});
  denied(result);
 }));
});
