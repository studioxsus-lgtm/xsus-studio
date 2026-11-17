import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createDecisionJournal} from "../../next-engines/orchestration/decision-journal.js";
import {createRecoveryCheckpoint} from "../../next-engines/orchestration/recovery-checkpoint.js";
const req=(id="phase19",trace="trace19")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{}},context:{principalId:"tester",traceId:trace,authorizationRef:"policy:test"}});
const expected={requestId:"phase19",traceId:"trace19"};
const snapshot=()=>{const journal=createDecisionJournal(coordinateSixEngines(req()));return {recovered:true,executionAuthorized:false,journal,checkpoint:createRecoveryCheckpoint(journal)};};
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase19-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 19 — read-only timeout reconciliation",()=>{
 it("returns not_observed without writing or declaring a retry safe",async()=>{
  let writes=0;
  const result=await reconcileReviewRecord(expected,{load:async()=>null,save:()=>{writes++;}});
  expect(result).toMatchObject({state:"not_observed",recorded:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
  expect(writes).toBe(0);
 });
 it("recognizes a persisted journal without saving it twice",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  const result=await reconcileReviewRecord(expected,store);
  expect(result).toMatchObject({state:"recorded_for_manual_review",recorded:true,completed:0,rejected:0,retrySafe:false,nextAction:"manual_review"});
  expect(Object.isFrozen(result)).toBe(true);
 }));
 it("rejects a different request or trace",async()=>{
  await expect(reconcileReviewRecord({requestId:"other",traceId:"trace19"},{load:async()=>snapshot()})).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  await expect(reconcileReviewRecord({requestId:"phase19",traceId:"other"},{load:async()=>snapshot()})).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
 });
 it("rejects a forged checkpoint and unsafe recovery acknowledgment",async()=>{
  const corrupted=snapshot();corrupted.checkpoint={...corrupted.checkpoint,completed:99};
  await expect(reconcileReviewRecord(expected,{load:async()=>corrupted})).rejects.toMatchObject({code:"CHECKPOINT_MISMATCH"});
  await expect(reconcileReviewRecord(expected,{load:async()=>({...snapshot(),executionAuthorized:true})})).rejects.toMatchObject({code:"PERSISTENCE_UNVERIFIED"});
 });
 it("rejects stores without a load function and invalid identifiers",async()=>{
  await expect(reconcileReviewRecord(expected,{})).rejects.toMatchObject({code:"INVALID_INPUT"});
  await expect(reconcileReviewRecord({requestId:"",traceId:"trace19"},{load:async()=>null})).rejects.toMatchObject({code:"INVALID_INPUT"});
 });
});
