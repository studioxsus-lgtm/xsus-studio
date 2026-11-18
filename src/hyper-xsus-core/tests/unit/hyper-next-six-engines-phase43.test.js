import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {inspectReviewLock} from "../../next-engines/orchestration/review-lock-recovery.js";
import {assessReviewRecovery} from "../../next-engines/orchestration/review-recovery-assessment.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const request={contractVersion:"1.0.0",requestId:"phase43",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase43",authorizationRef:"policy:test"}};
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase43-"));
 try{const filePath=join(dir,"journal.json"),store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request));return await fn(filePath,store);}
 finally{await rm(dir,{recursive:true,force:true});}};
const denied=r=>expect(r).toMatchObject({recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false});
const assess=(filePath,store)=>assessReviewRecovery({filePath,store,requestId:"phase43",traceId:"trace-phase43"});
describe("Hyper phase 43 — lock ownership identity stability",()=>{
 it("detects token replacement with the same PID between observations",async()=>fixture(async(filePath,store)=>{
  const lockPath=filePath+".lock";
  await writeFile(lockPath,JSON.stringify({pid:process.pid,token:randomUUID()}));
  const injected={load:async()=>{
   // Rotate ownership before the underlying store attempts to acquire
   // its lock; store.load may fail closed with XSUS_FILE_LOCK_BUSY.
   await writeFile(lockPath,JSON.stringify({pid:process.pid,token:randomUUID()}));
   return store.load();
  }};
  const result=await assess(filePath,injected);
  expect(result).toMatchObject({state:"review_blocked",lockState:"changed_during_assessment"});
  denied(result);
 }));
 it("does not expose raw lock token in inspection output",async()=>fixture(async(filePath)=>{
  const token=randomUUID();
  await writeFile(filePath+".lock",JSON.stringify({pid:process.pid,token}));
  const result=await inspectReviewLock({filePath});
  expect(result.state).toBe("lock_observed");
  expect(result.ownerFingerprint).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(result)).not.toContain(token);
  denied(result);
 }));
 it("reports stable identity for repeated read-only observations",async()=>fixture(async(filePath)=>{
  await writeFile(filePath+".lock",JSON.stringify({pid:process.pid,token:randomUUID()}));
  const first=await inspectReviewLock({filePath});
  const second=await inspectReviewLock({filePath});
  expect(first.ownerFingerprint).toBe(second.ownerFingerprint);
  denied(second);
 }));
 it("retains manual-only review without a lock",async()=>fixture(async(filePath,store)=>{
  const result=await assess(filePath,store);
  expect(result).toMatchObject({state:"recorded_for_manual_review",lockState:"not_observed"});
  denied(result);
 }));
});
