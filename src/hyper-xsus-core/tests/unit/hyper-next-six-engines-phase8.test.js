import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
function req(requestId="persist-1"){return {contractVersion:"1.0.0",requestId,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"X",evidence:[]},execution:{}}},context:{principalId:"tester",traceId:"trace-persist",authorizationRef:"policy:test"}};}
describe("Six engines phase 8 — atomic journal persistence",()=>{
  async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-six-engine-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
  it("survives a new store instance without enabling execution",async()=>fixture(async filePath=>{
    const response=coordinateSixEngines(req());
    await createPersistentDecisionJournalStore({filePath}).save(response);
    const restored=await createPersistentDecisionJournalStore({filePath}).load();
    expect(restored.recovered).toBe(true);
    expect(restored.journal.entries).toHaveLength(2);
    expect(restored.executionAuthorized).toBe(false);
    expect(restored.checkpoint.resumeExecution).toBe(false);
  }));
  it("rejects conflicting request without overwriting committed data",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    await store.save(coordinateSixEngines(req()));
    const before=await readFile(filePath,"utf8");
    await expect(store.save(coordinateSixEngines(req("other")))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
    expect(await readFile(filePath,"utf8")).toBe(before);
  }));
  it("detects tampered snapshot",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    await store.save(coordinateSixEngines(req()));
    const data=JSON.parse(await readFile(filePath,"utf8"));
    data.payload.checkpoint.completed=999;
    await writeFile(filePath,JSON.stringify(data));
    await expect(store.load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
  }));
  it("rejects invalid JSON rather than silently starting fresh",async()=>fixture(async filePath=>{
    await writeFile(filePath,"{broken");
    await expect(createPersistentDecisionJournalStore({filePath}).load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
  }));
  it("returns null for an absent journal",async()=>fixture(async filePath=>{
    expect(await createPersistentDecisionJournalStore({filePath}).load()).toBeNull();
  }));
  it("treats repeated identical saves as idempotent",async()=>fixture(async filePath=>{
    const store=createPersistentDecisionJournalStore({filePath});
    const response=coordinateSixEngines(req());
    await store.save(response);
    const before=await readFile(filePath,"utf8");
    await store.save(response);
    expect(await readFile(filePath,"utf8")).toBe(before);
  }));
});
