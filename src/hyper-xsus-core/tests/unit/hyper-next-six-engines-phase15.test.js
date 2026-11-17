import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {coordinateAndRecord} from "../../next-engines/orchestration/review-pipeline.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const request=(inputs,id="phase15")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs},context:{principalId:"tester",traceId:"trace15",authorizationRef:"policy:test"}});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase15-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 15 — integrated review-only pipeline",()=>{
 it("records and verifies an empty six-engine request without execution",async()=>fixture(async filePath=>{
   const output=await coordinateAndRecord(request({}),createPersistentDecisionJournalStore({filePath}));
   expect(output).toMatchObject({recorded:true,completed:0,rejected:0,executionAuthorized:false,sideEffects:false,nextAction:"manual_review"});
 }));
 it("records all six stages in canonical order",async()=>fixture(async filePath=>{
   const inputs={agents:{},improvement:{},execution:{},planning:{},learning:{},truth:{}};
   const store=createPersistentDecisionJournalStore({filePath});
   const output=await coordinateAndRecord(request(inputs),store);
   expect(output.completed).toBe(6);
   expect((await store.load()).journal.entries.map(e=>e.stage)).toEqual(["truth","learning","planning","execution","improvement","agents"]);
   expect(output.executionAuthorized).toBe(false);
 }));
 it("records rejected engine contracts without authorizing execution",async()=>fixture(async filePath=>{
   const store=createPersistentDecisionJournalStore({filePath});
   const output=await coordinateAndRecord(request({truth:{},planning:{}}),store);
   expect(output.completed).toBe(2);
   expect(output.executionAuthorized).toBe(false);
   expect((await store.load()).journal.entries).toHaveLength(2);
 }));
 it("accepts an identical retry without changing committed bytes",async()=>fixture(async filePath=>{
   const store=createPersistentDecisionJournalStore({filePath});
   const input=request({truth:{claim:"Example",evidence:[]}});
   await coordinateAndRecord(input,store);
   const before=await readFile(filePath,"utf8");
   const second=await coordinateAndRecord(input,store);
   expect(second.recorded).toBe(true);
   expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("rejects a conflicting request without replacing the original",async()=>fixture(async filePath=>{
   const store=createPersistentDecisionJournalStore({filePath});
   await coordinateAndRecord(request({}),store);
   const before=await readFile(filePath,"utf8");
   await expect(coordinateAndRecord(request({truth:{}}, "other"),store)).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
   expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("rejects a forged save acknowledgment",async()=>{
   const store={save:async()=>({saved:true,requestId:"phase15",executionAuthorized:true}),load:async()=>null};
   await expect(coordinateAndRecord(request({}),store)).rejects.toMatchObject({code:"PERSISTENCE_UNVERIFIED"});
 });
 it("rejects an unverified readback",async()=>{
   const store={save:async()=>({saved:true,requestId:"phase15",executionAuthorized:false}),load:async()=>null};
   await expect(coordinateAndRecord(request({}),store)).rejects.toMatchObject({code:"PERSISTENCE_UNVERIFIED"});
 });
 it("rejects mismatched recovered content",async()=>fixture(async filePath=>{
   const real=createPersistentDecisionJournalStore({filePath});
   const store={save:r=>real.save(r),load:async()=>({...await real.load(),journal:{...((await real.load()).journal),traceId:"forged"}})};
   await expect(coordinateAndRecord(request({}),store)).rejects.toMatchObject({code:"PERSISTENCE_MISMATCH"});
 }));
 it("does not claim recording after a writer failure",async()=>fixture(async filePath=>{
   const store=createPersistentDecisionJournalStore({filePath,atomicWriter:async()=>{throw new Error("DISK_UNAVAILABLE");}});
   await expect(coordinateAndRecord(request({}),store)).rejects.toThrow("DISK_UNAVAILABLE");
 }));
 it("rejects missing persistence contract",async()=>{
   await expect(coordinateAndRecord(request({}),{})).rejects.toMatchObject({code:"INVALID_INPUT"});
 });
});
