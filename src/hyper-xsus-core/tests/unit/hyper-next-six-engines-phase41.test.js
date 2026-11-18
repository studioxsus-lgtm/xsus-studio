import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {assessReviewRecovery} from "../../next-engines/orchestration/review-recovery-assessment.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
const req=()=>({contractVersion:"1.0.0",requestId:"phase41",engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-phase41",authorizationRef:"policy:test"}});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase41-"));
 try{const filePath=join(dir,"journal.json");const store=createPersistentDecisionJournalStore({filePath});
  return await fn({filePath,store});}
 finally{await rm(dir,{recursive:true,force:true});}};
const assess=({filePath,store},traceId="trace-phase41")=>assessReviewRecovery({
 filePath,store,requestId:"phase41",traceId
});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 41 — combined lock and journal recovery assessment",()=>{
 it("reports verified record with absent lock as manual review only",async()=>fixture(async ctx=>{
  await ctx.store.save(coordinateSixEngines(req()));
  const result=await assess(ctx);
  expect(result).toMatchObject({state:"recorded_for_manual_review",lockState:"not_observed",
   journalState:"recorded_for_manual_review",nextAction:"manual_review"});
  denied(result);
 }));
 it("does not treat missing journal and missing lock as retry authorization",async()=>fixture(async ctx=>{
  const result=await assess(ctx);
  expect(result).toMatchObject({state:"review_blocked",lockState:"not_observed",
   journalState:"not_observed",nextAction:"manual_investigation"});
  denied(result);
 }));
 it("does not bypass a held lock even when journal was previously recorded",async()=>fixture(async ctx=>{
  await ctx.store.save(coordinateSixEngines(req()));
  await withExclusiveFileLock(ctx.filePath,async()=>{
   const result=await assess(ctx);
   expect(result).toMatchObject({state:"review_blocked",lockState:"lock_observed",
    journalState:"unverified",errorCode:"XSUS_FILE_LOCK_BUSY"});
   denied(result);
  });
 }));
 it("reports damaged journal as unverified without modifying it",async()=>fixture(async ctx=>{
  await writeFile(ctx.filePath,"{bad");
  const result=await assess(ctx);
  expect(result).toMatchObject({state:"review_blocked",journalState:"unverified",
   errorCode:"CORRUPT_JOURNAL"});
  denied(result);
 }));
 it("rejects mismatched recovery trace without leaking journal contents",async()=>fixture(async ctx=>{
  await ctx.store.save(coordinateSixEngines(req()));
  const result=await assess(ctx,"wrong-trace");
  expect(result).toMatchObject({state:"review_blocked",journalState:"unverified",
   errorCode:"JOURNAL_CONFLICT"});
  expect(JSON.stringify(result)).not.toContain("principalId");
  denied(result);
 }));
 it("does not infer recovery authorization from malformed lock metadata",async()=>fixture(async ctx=>{
  await writeFile(ctx.filePath+".lock","{invalid");
  const result=await assess(ctx);
  expect(result.lockState).toBe("unverifiable_lock");
  expect(result.state).toBe("review_blocked");
  denied(result);
 }));
});
