import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {coordinateAndRecord} from "../../next-engines/orchestration/review-pipeline.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const req=(id,inputs={truth:{claim:"Example",evidence:[]}})=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs},context:{principalId:"load-test",traceId:"trace-"+id,authorizationRef:"policy:test"}});
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),"xsus-phase16-"));try{await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 16 — bounded concurrency and persistence",()=>{
 it("serializes 40 identical concurrent requests to a single journal",async()=>fixture(async dir=>{
  const filePath=join(dir,"journal.json");
  const store=createPersistentDecisionJournalStore({filePath});
  const responses=await Promise.all(Array.from({length:40},()=>coordinateAndRecord(req("same"),store)));
  expect(responses).toHaveLength(40);
  expect(responses.every(r=>r.recorded&&r.executionAuthorized===false)).toBe(true);
  expect((await store.load()).journal.requestId).toBe("same");
  expect((await readdir(dir)).sort()).toEqual(["journal.json"]);
 }));
 it("rejects 39 competing distinct requests while preserving one committed journal",async()=>fixture(async dir=>{
  const filePath=join(dir,"journal.json");
  const store=createPersistentDecisionJournalStore({filePath});
  const settled=await Promise.allSettled(Array.from({length:40},(_,i)=>coordinateAndRecord(req("id-"+i),store)));
  const fulfilled=settled.filter(r=>r.status==="fulfilled");
  const rejected=settled.filter(r=>r.status==="rejected");
  expect(fulfilled).toHaveLength(1);
  expect(rejected).toHaveLength(39);
  expect(rejected.every(r=>r.reason?.code==="JOURNAL_CONFLICT")).toBe(true);
  expect((await store.load()).journal.requestId).toBe(fulfilled[0].value.requestId);
  expect((await readdir(dir)).sort()).toEqual(["journal.json"]);
 }));
 it("isolates 24 independent journals with distinct traces",async()=>fixture(async dir=>{
  const results=await Promise.all(Array.from({length:24},async(_,i)=>{
   const filePath=join(dir,"journal-"+i+".json");
   const store=createPersistentDecisionJournalStore({filePath});
   const output=await coordinateAndRecord(req("independent-"+i),store);
   const restored=await store.load();
   return {output,restored};
  }));
  expect(results).toHaveLength(24);
  for(let i=0;i<results.length;i++){
   expect(results[i].output.requestId).toBe("independent-"+i);
   expect(results[i].restored.journal.traceId).toBe("trace-independent-"+i);
   expect(results[i].restored.executionAuthorized).toBe(false);
  }
  expect((await readdir(dir)).length).toBe(24);
 }));
 it("recovers after a rejected write without poisoning the queue",async()=>fixture(async dir=>{
  const store=createPersistentDecisionJournalStore({filePath:join(dir,"journal.json")});
  await coordinateAndRecord(req("original"),store);
  await expect(coordinateAndRecord(req("conflict"),store)).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect((await coordinateAndRecord(req("original"),store)).recorded).toBe(true);
  expect((await store.load()).journal.requestId).toBe("original");
 }));
 it("does not leak payload contents into the persisted decision journal",async()=>fixture(async dir=>{
  const secret="UNIQUE_PRIVATE_PAYLOAD_DO_NOT_PERSIST_87391";
  const store=createPersistentDecisionJournalStore({filePath:join(dir,"journal.json")});
  await coordinateAndRecord(req("privacy",{truth:{claim:secret,evidence:[]}}),store);
  const raw=await readFile(join(dir,"journal.json"),"utf8");
  expect(raw).not.toContain(secret);
  expect(JSON.parse(raw).payload.journal.entries).toHaveLength(1);
 }));
 it("preserves canonical order and review-only flags for all six stages",async()=>fixture(async dir=>{
  const store=createPersistentDecisionJournalStore({filePath:join(dir,"journal.json")});
  const output=await coordinateAndRecord(req("six",{agents:{},improvement:{},execution:{},planning:{},learning:{},truth:{}}),store);
  expect(output).toMatchObject({completed:6,recorded:true,executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
  expect((await store.load()).journal.entries.map(e=>e.stage)).toEqual(["truth","learning","planning","execution","improvement","agents"]);
 }));
});
