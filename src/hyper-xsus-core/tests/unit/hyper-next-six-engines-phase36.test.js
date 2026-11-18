import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
const req=(id="phase36")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase36-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const identity=id=>({requestId:id,traceId:"trace-"+id});
describe("Hyper phase 36 — persistence recovery and integrity failure isolation",()=>{
 it("recovers an acknowledged journal after a new store instance starts",async()=>fixture(async filePath=>{
  const first=createPersistentDecisionJournalStore({filePath});
  await first.save(coordinateSixEngines(req()));
  const restarted=createPersistentDecisionJournalStore({filePath});
  expect(await reconcileReviewRecord(identity("phase36"),restarted)).toMatchObject({
   state:"recorded_for_manual_review",recorded:true,retrySafe:false,executionAuthorized:false,sideEffects:false
  });
 }));
 it("refuses malformed persisted JSON without attempting a repair",async()=>fixture(async filePath=>{
  await writeFile(filePath,'{"version":1,"payload":',"utf8");
  const store=createPersistentDecisionJournalStore({filePath});
  await expect(store.load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
  expect(await readFile(filePath,"utf8")).toBe('{"version":1,"payload":');
 }));
 it("detects a modified envelope digest and preserves original bytes",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  const envelope=JSON.parse(await readFile(filePath,"utf8"));
  envelope.payload.journal.requestId="tampered";
  const altered=JSON.stringify(envelope);
  await writeFile(filePath,altered,"utf8");
  await expect(store.load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
  expect(await readFile(filePath,"utf8")).toBe(altered);
 }));
 it("does not acknowledge failed atomic writes and permits a subsequent explicit retry",async()=>fixture(async filePath=>{
  let attempts=0;
  const failing=createPersistentDecisionJournalStore({filePath,atomicWriter:async()=>{attempts++;throw Error("INJECTED_WRITE_FAILURE");}});
  await expect(failing.save(coordinateSixEngines(req()))).rejects.toThrow("INJECTED_WRITE_FAILURE");
  expect(attempts).toBe(1);
  expect(await failing.load()).toBeNull();
  const healthy=createPersistentDecisionJournalStore({filePath});
  await expect(healthy.save(coordinateSixEngines(req()))).resolves.toMatchObject({saved:true,executionAuthorized:false});
  expect(await reconcileReviewRecord(identity("phase36"),healthy)).toMatchObject({recorded:true,retrySafe:false});
 }));
 it("does not overwrite a valid record with a conflicting request",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  const before=await readFile(filePath,"utf8");
  await expect(store.save(coordinateSixEngines(req("different")))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("treats an absent record as unknown, never as safe to retry automatically",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  expect(await reconcileReviewRecord(identity("phase36"),store)).toMatchObject({
   state:"not_observed",recorded:false,retrySafe:false,executionAuthorized:false,sideEffects:false
  });
 }));
});
