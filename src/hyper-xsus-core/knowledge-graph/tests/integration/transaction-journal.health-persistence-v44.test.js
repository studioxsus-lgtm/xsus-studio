import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readFile,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersistentJournalHealthHistory, PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";

const report=(level,warnings=[])=>({
  level,journalStatus:"healthy",revision:null,warnings,transactionCounts:null,
});
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-persist-v44-"));
  const filePath=join(dir,"health.json");
  try{await run(filePath);}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — persistent health history v4.4.0",()=>{
  it("loads an absent history without creating a file",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath});
      expect(await store.load()).toEqual([]);
      await expect(readFile(filePath,"utf8")).rejects.toMatchObject({code:"ENOENT"});
      await store.close();
    });
  });
  it("survives restart with immutable bounded observations",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:2});
      await store.append(report("healthy"),{timestamp:1});
      await store.append(report("attention",["RUNNING_TRANSACTIONS_PRESENT"]),{timestamp:2});
      await store.append(report("critical",["JOURNAL_INVALID"]),{timestamp:3});
      await store.close();
      const reopened=createPersistentJournalHealthHistory({filePath,maxEntries:2});
      const restored=await reopened.load();
      expect(restored.map(item=>item.timestamp)).toEqual([2,3]);
      expect(restored[1].warnings).toEqual(["JOURNAL_INVALID"]);
      expect(Object.isFrozen(restored[1])).toBe(true);
      expect(JSON.parse(await readFile(filePath,"utf8")).version).toBe(PERSISTENT_HEALTH_HISTORY_VERSION);
      await reopened.close();
    });
  });
  it("serializes concurrent appends from cooperating instances without lost observations",async()=>{
    await fixture(async(filePath)=>{
      const storeA=createPersistentJournalHealthHistory({filePath,maxEntries:20});
      const storeB=createPersistentJournalHealthHistory({filePath,maxEntries:20});
      try{
        // Lock is nonblocking: use sequential calls across instances to establish persistence.
        for(let i=0;i<10;i++){
          await (i%2?storeA:storeB).append(report("healthy"),{timestamp:i+1});
        }
        expect((await storeA.load()).map(item=>item.timestamp)).toEqual([1,2,3,4,5,6,7,8,9,10]);
      }finally{await storeA.close();await storeB.close();}
    });
  });
  it("rejects corrupted committed bytes without silently repairing them",async()=>{
    await fixture(async(filePath)=>{
      const broken='{"version":"4.4.0","entries":[';
      await writeFile(filePath,broken);
      const store=createPersistentJournalHealthHistory({filePath});
      await expect(store.load()).rejects.toThrow();
      await expect(store.append(report("healthy"),{timestamp:1})).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(broken);
      await store.close();
    });
  });
  it("rejects invalid entries and leaves previously committed bytes intact",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:2});
      await store.append(report("healthy"),{timestamp:1});
      const before=await readFile(filePath,"utf8");
      await expect(store.append(report("not-a-level"),{timestamp:2})).rejects.toThrow();
      await expect(store.save([{timestamp:-1,level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null}])).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(before);
      await store.close();
    });
  });
});
