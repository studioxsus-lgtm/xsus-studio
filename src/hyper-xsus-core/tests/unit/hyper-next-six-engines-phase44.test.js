import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {observeReviewJournal} from "../../next-engines/orchestration/review-journal-observation.js";
import {assessReviewRecovery} from "../../next-engines/orchestration/review-recovery-assessment.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const request={contractVersion:"1.0.0",requestId:"phase44",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase44",authorizationRef:"policy:test"}};
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase44-"));
 try{const filePath=join(dir,"journal.json"),store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request));return await fn(filePath,store,dir);}
 finally{await rm(dir,{recursive:true,force:true});}};
const assess=(filePath,store)=>assessReviewRecovery({filePath,store,requestId:"phase44",traceId:"trace-phase44"});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false});
describe("Hyper phase 44 — journal integrity across recovery assessment",()=>{
 it("keeps a stable verified journal for manual review only",async()=>fixture(async(path,store)=>{
  const result=await assess(path,store);
  expect(result).toMatchObject({state:"recorded_for_manual_review",journalState:"recorded_for_manual_review"});
  denied(result);
 }));
 it("detects journal mutation after successful reconciliation",async()=>fixture(async(path,store)=>{
  const injected={load:async()=>{const result=await store.load();await writeFile(path,"tampered");return result;}};
  const result=await assess(path,injected);
  expect(result).toMatchObject({state:"review_blocked",journalState:"changed_during_assessment"});
  denied(result);
 }));
 it("detects journal mutation even when reconciliation throws",async()=>fixture(async(path)=>{
  const injected={load:async()=>{await writeFile(path,"changed");throw Error("interrupted");}};
  const result=await assess(path,injected);
  expect(result).toMatchObject({state:"review_blocked",journalState:"changed_during_assessment"});
  denied(result);
 }));
 it("rejects symlink journal observation without reading target",async()=>fixture(async(path,store,dir)=>{
  const target=join(dir,"target.json");await writeFile(target,"secret");
  await rm(path);await symlink(target,path);
  const result=await observeReviewJournal({filePath:path});
  expect(result.state).toBe("unverifiable");
  expect(JSON.stringify(result)).not.toContain("secret");
  denied(result);
 }));
 it("enforces bounded journal observation",async()=>fixture(async(path)=>{
  const result=await observeReviewJournal({filePath:path,maxBytes:1});
  expect(result.state).toBe("unverifiable");denied(result);
 }));
 it("produces a stable digest for unchanged journal bytes",async()=>fixture(async(path)=>{
  const first=await observeReviewJournal({filePath:path});
  const second=await observeReviewJournal({filePath:path});
  expect(first.state).toBe("observed");
  expect(first.fingerprint).toBe(second.fingerprint);
  expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  denied(second);
 }));
});
