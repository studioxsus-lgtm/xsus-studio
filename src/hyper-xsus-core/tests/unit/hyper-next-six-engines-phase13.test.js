import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {writeAtomicJson} from "../../knowledge-graph/integration/atomic-json-writer.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const req=(id="phase13")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"test",traceId:"trace13",authorizationRef:"policy:test"}});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase13-"));try{await fn(dir,join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 13 — post-rename uncertainty",()=>{
 it("reports directory sync failure while retaining committed bytes for inspection",async()=>fixture(async(dir,filePath)=>{
   let opens=0;
   const fs=await import("node:fs/promises");
   const writer=(path,payload)=>writeAtomicJson(path,payload,{io:{open:async(...args)=>{
     const handle=await fs.open(...args);
     if(++opens===2)return {sync:async()=>{throw new Error("INJECT_DIR_SYNC");},close:()=>handle.close()};
     return handle;
   }}});
   const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
   await expect(store.save(coordinateSixEngines(req()))).rejects.toThrow("INJECT_DIR_SYNC");
   expect(JSON.parse(await readFile(filePath,"utf8")).version).toBe(1);
   expect((await createPersistentDecisionJournalStore({filePath}).load()).journal.requestId).toBe("phase13");
   expect(await readdir(dir)).toEqual(["journal.json"]);
 }));
 it("accepts identical retry after post-rename error without writing again",async()=>fixture(async(dir,filePath)=>{
   let attempts=0;
   const writer=async(path,payload)=>{
     attempts++;
     await writeAtomicJson(path,payload);
     throw new Error("POST_COMMIT_ACK_LOST");
   };
   const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
   const response=coordinateSixEngines(req());
   await expect(store.save(response)).rejects.toThrow("POST_COMMIT_ACK_LOST");
   const before=await readFile(filePath,"utf8");
   await expect(store.save(response)).resolves.toMatchObject({saved:true,executionAuthorized:false});
   expect(attempts).toBe(1);
   expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("rejects conflicting retry after post-rename error",async()=>fixture(async(dir,filePath)=>{
   const writer=async(path,payload)=>{await writeAtomicJson(path,payload);throw new Error("ACK_LOST");};
   const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
   await expect(store.save(coordinateSixEngines(req()))).rejects.toThrow("ACK_LOST");
   const before=await readFile(filePath,"utf8");
   await expect(store.save(coordinateSixEngines(req("different")))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
   expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("rejects same ID but different trace after uncertain commit",async()=>fixture(async(dir,filePath)=>{
   const writer=async(path,payload)=>{await writeAtomicJson(path,payload);throw new Error("ACK_LOST");};
   const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
   await expect(store.save(coordinateSixEngines(req()))).rejects.toThrow("ACK_LOST");
   const altered={...req(),context:{...req().context,traceId:"forged"}};
   await expect(store.save(coordinateSixEngines(altered))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
 }));
});
