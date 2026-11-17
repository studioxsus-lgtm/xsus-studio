import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,readdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {writeAtomicJson} from "../../knowledge-graph/integration/atomic-json-writer.js";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const request=(id="phase11")=>({contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Evidence",evidence:[]}}},context:{principalId:"test",traceId:"trace-11",authorizationRef:"policy:test"}});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase11-"));try{await fn(dir,join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 11 — atomic fault boundaries",()=>{
  it("preserves absence and removes temp file when rename fails",async()=>fixture(async(dir,filePath)=>{
    const writer=(path,payload)=>writeAtomicJson(path,payload,{io:{rename:async()=>{throw new Error("INJECT_RENAME_FAILURE");}}});
    const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
    await expect(store.save(coordinateSixEngines(request()))).rejects.toThrow("INJECT_RENAME_FAILURE");
    expect(await readdir(dir)).toEqual([]);
    expect(await createPersistentDecisionJournalStore({filePath}).load()).toBeNull();
  }));
  it("allows retry after failed atomic commit on same store",async()=>fixture(async(dir,filePath)=>{
    let attempts=0;
    const writer=async(path,payload)=>{if(++attempts===1)throw new Error("INJECT_BEFORE_COMMIT");return writeAtomicJson(path,payload);};
    const store=createPersistentDecisionJournalStore({filePath,atomicWriter:writer});
    await expect(store.save(coordinateSixEngines(request()))).rejects.toThrow("INJECT_BEFORE_COMMIT");
    await expect(store.save(coordinateSixEngines(request()))).resolves.toMatchObject({saved:true});
    expect((await store.load()).journal.requestId).toBe("phase11");
    expect(await readdir(dir)).toEqual(["journal.json"]);
  }));
  it("never overwrites a valid committed journal after a conflicting save",async()=>fixture(async(dir,filePath)=>{
    const store=createPersistentDecisionJournalStore({filePath});
    await store.save(coordinateSixEngines(request()));
    const original=await readFile(filePath,"utf8");
    await expect(store.save(coordinateSixEngines(request("other")))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
    expect(await readFile(filePath,"utf8")).toBe(original);
    expect(await readdir(dir)).toEqual(["journal.json"]);
  }));
  it("fails closed on truncated JSON and retains bytes",async()=>fixture(async(dir,filePath)=>{
    const store=createPersistentDecisionJournalStore({filePath});
    await store.save(coordinateSixEngines(request()));
    const truncated=(await readFile(filePath,"utf8")).slice(0,20);
    await writeFile(filePath,truncated);
    await expect(store.load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
    expect(await readFile(filePath,"utf8")).toBe(truncated);
  }));
  it("rejects a modified digest without mutating the journal",async()=>fixture(async(dir,filePath)=>{
    const store=createPersistentDecisionJournalStore({filePath});
    await store.save(coordinateSixEngines(request()));
    const document=JSON.parse(await readFile(filePath,"utf8"));
    document.digest="0".repeat(64);
    const corrupted=JSON.stringify(document);
    await writeFile(filePath,corrupted);
    await expect(store.load()).rejects.toMatchObject({code:"CORRUPT_JOURNAL"});
    expect(await readFile(filePath,"utf8")).toBe(corrupted);
  }));
  it("releases exclusive lock after a writer failure",async()=>fixture(async(dir,filePath)=>{
    const broken=createPersistentDecisionJournalStore({filePath,atomicWriter:async()=>{throw new Error("INJECT_IO");}});
    await expect(broken.save(coordinateSixEngines(request()))).rejects.toThrow("INJECT_IO");
    const good=createPersistentDecisionJournalStore({filePath});
    await good.save(coordinateSixEngines(request()));
    expect((await good.load()).journal.requestId).toBe("phase11");
  }));
  it("rejects non-callable writer injection",()=>expect(()=>createPersistentDecisionJournalStore({filePath:"journal.json",atomicWriter:null})).toThrow());
});
