import {describe,it,expect} from "vitest";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {reconcileReviewRecord} from "../../next-engines/orchestration/review-reconciliation.js";
const req=(id="phase37")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase37-"));
 try{return await fn(join(dir,"journal.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
describe("Hyper phase 37 — concurrent journal lock and conflict integrity",()=>{
 it("serializes same-instance concurrent identical saves without duplicate writes",async()=>fixture(async filePath=>{
  const {writeAtomicJson}=await import("../../knowledge-graph/integration/atomic-json-writer.js");
  let writes=0;
  const store=createPersistentDecisionJournalStore({filePath,atomicWriter:async(...args)=>{writes++;return writeAtomicJson(...args);}});
  const response=coordinateSixEngines(req());
  const results=await Promise.all(Array.from({length:8},()=>store.save(response)));
  expect(results).toHaveLength(8);
  expect(results.every(x=>x.saved===true&&x.executionAuthorized===false)).toBe(true);
  expect(writes).toBe(1);
 }));
 it("prevents a conflicting save from overwriting an existing journal",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  const winner=coordinateSixEngines(req());
  const conflict=coordinateSixEngines(req("other"));
  await store.save(winner);
  const before=await readFile(filePath,"utf8");
  await expect(store.save(conflict)).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("serializes load behind a pending same-instance write",async()=>fixture(async filePath=>{
  const {writeAtomicJson}=await import("../../knowledge-graph/integration/atomic-json-writer.js");
  const entered=deferred(),release=deferred();
  const store=createPersistentDecisionJournalStore({filePath,atomicWriter:async(...args)=>{
   entered.resolve();await release.promise;return writeAtomicJson(...args);
  }});
  const saving=store.save(coordinateSixEngines(req()));
  await entered.promise;
  let observed=false;
  const loading=store.load().then(x=>{observed=true;return x;});
  await Promise.resolve();await Promise.resolve();
  expect(observed).toBe(false);
  release.resolve();
  await saving;
  expect(await loading).toMatchObject({recovered:true,executionAuthorized:false});
 }));
 it("rejects mismatched trace identities during reconciliation",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  await expect(reconcileReviewRecord({requestId:"phase37",traceId:"wrong"},store))
   .rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
 }));
 it("keeps repeated readbacks consistent and review-only",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(req()));
  const snapshots=await Promise.all(Array.from({length:10},()=>store.load()));
  expect(snapshots.every(s=>s.recovered===true&&s.executionAuthorized===false)).toBe(true);
  expect(snapshots.map(s=>JSON.stringify(s.journal)).every(s=>s===JSON.stringify(snapshots[0].journal))).toBe(true);
 }));
});
