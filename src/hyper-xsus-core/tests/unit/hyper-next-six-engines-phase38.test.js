import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
const req=(id="phase38")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase38-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper phase 38 — independent store instances and lock contention",()=>{
 it("rejects a second instance while the first holds the filesystem lock",async()=>fixture(async filePath=>{
  const entered=deferred(),release=deferred();
  const holder=withExclusiveFileLock(filePath,async()=>{entered.resolve();await release.promise;});
  await entered.promise;
  try{
   const second=createPersistentDecisionJournalStore({filePath});
   await expect(second.load()).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
  }finally{release.resolve();await holder;}
 }));
 it("recovers the same durable journal from a fresh instance",async()=>fixture(async filePath=>{
  const first=createPersistentDecisionJournalStore({filePath});
  await first.save(coordinateSixEngines(req()));
  const second=createPersistentDecisionJournalStore({filePath});
  expect(await second.load()).toMatchObject({recovered:true,executionAuthorized:false});
 }));
 it("refuses conflicting request across independent store instances",async()=>fixture(async filePath=>{
  const first=createPersistentDecisionJournalStore({filePath});
  const second=createPersistentDecisionJournalStore({filePath});
  await first.save(coordinateSixEngines(req()));
  const original=await readFile(filePath,"utf8");
  await expect(second.save(coordinateSixEngines(req("conflict"))))
   .rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(original);
 }));
 it("preserves idempotence across independent store instances",async()=>fixture(async filePath=>{
  const first=createPersistentDecisionJournalStore({filePath});
  const second=createPersistentDecisionJournalStore({filePath});
  const response=coordinateSixEngines(req());
  await first.save(response);
  const original=await readFile(filePath,"utf8");
  await expect(second.save(response)).resolves.toMatchObject({saved:true,executionAuthorized:false});
  expect(await readFile(filePath,"utf8")).toBe(original);
 }));
 it("allows a fresh instance to proceed after a released lock",async()=>fixture(async filePath=>{
  await withExclusiveFileLock(filePath,async()=>{});
  const store=createPersistentDecisionJournalStore({filePath});
  await expect(store.save(coordinateSixEngines(req()))).resolves.toMatchObject({saved:true});
  expect(await store.load()).toMatchObject({recovered:true,executionAuthorized:false});
 }));
});
