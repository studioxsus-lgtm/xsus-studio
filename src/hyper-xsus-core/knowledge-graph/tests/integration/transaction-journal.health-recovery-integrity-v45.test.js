import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readFile,writeFile,readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";
import { createPersistentJournalHealthHistory,PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";

const observation=(level="healthy")=>({
  level,journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null,
});
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-recovery-v45-"));
  const filePath=join(dir,"health.json");
  try {await run({dir,filePath});}
  finally {await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — health history recovery and integrity v4.5.0",()=>{
  it("keeps previously committed bytes when atomic rename fails",async()=>{
    await fixture(async({dir,filePath})=>{
      const store=createPersistentJournalHealthHistory({filePath});
      await store.append(observation(),{timestamp:1});
      await store.close();
      const before=await readFile(filePath,"utf8");
      const next={version:PERSISTENT_HEALTH_HISTORY_VERSION,entries:[]};
      await expect(writeAtomicJson(filePath,next,{io:{
        rename:async()=>{throw Object.assign(new Error("injected rename failure"),{code:"EIO"});}
      }})).rejects.toMatchObject({code:"EIO"});
      expect(await readFile(filePath,"utf8")).toBe(before);
      expect((await readdir(dir)).sort()).toEqual(["health.json"]);
      const reopened=createPersistentJournalHealthHistory({filePath});
      expect((await reopened.load()).map(item=>item.timestamp)).toEqual([1]);
      await reopened.close();
    });
  });
  it("retains renamed committed snapshot if directory sync fails after rename",async()=>{
    await fixture(async({filePath})=>{
      const original=createPersistentJournalHealthHistory({filePath});
      await original.append(observation(),{timestamp:1});
      await original.close();
      const next={version:PERSISTENT_HEALTH_HISTORY_VERSION,entries:[]};
      const {open}=await import("node:fs/promises");
      await expect(writeAtomicJson(filePath,next,{io:{
        open:async(path,flags,...args)=>{
          const handle=await open(path,flags,...args);
          if(path===filePath.slice(0,filePath.lastIndexOf("/")) && flags==="r")
            return {...handle,sync:async()=>{throw Object.assign(new Error("injected directory sync failure"),{code:"EIO"});},close:()=>handle.close()};
          return handle;
        },
      }})).rejects.toMatchObject({code:"EIO"});
      expect(JSON.parse(await readFile(filePath,"utf8"))).toEqual(next);
      const restarted=createPersistentJournalHealthHistory({filePath});
      expect(await restarted.load()).toEqual([]);
      await restarted.close();
    });
  });
  it("fails closed on corrupt committed history and accepts explicit trusted restore",async()=>{
    await fixture(async({filePath})=>{
      const store=createPersistentJournalHealthHistory({filePath});
      await store.append(observation(),{timestamp:7});
      const trusted=await readFile(filePath,"utf8");
      const damaged='{"version":"4.4.0","entries":[';
      await writeFile(filePath,damaged,"utf8");
      await expect(store.load()).rejects.toThrow();
      await expect(store.append(observation(),{timestamp:8})).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(damaged);
      await store.close();
      await writeFile(filePath,trusted,"utf8");
      const restarted=createPersistentJournalHealthHistory({filePath});
      expect((await restarted.load()).map(x=>x.timestamp)).toEqual([7]);
      await restarted.close();
    });
  });
  it("does not treat unrelated temporary files as committed history",async()=>{
    await fixture(async({dir,filePath})=>{
      const store=createPersistentJournalHealthHistory({filePath});
      await store.append(observation(),{timestamp:3});
      await store.close();
      const before=await readFile(filePath,"utf8");
      const orphan=join(dir,".health.json.123e4567-e89b-42d3-a456-426614174000.tmp");
      await writeFile(orphan,"incomplete");
      const restarted=createPersistentJournalHealthHistory({filePath});
      expect((await restarted.load()).map(x=>x.timestamp)).toEqual([3]);
      expect(await readFile(filePath,"utf8")).toBe(before);
      expect(await readFile(orphan,"utf8")).toBe("incomplete");
      await restarted.close();
    });
  });
});
