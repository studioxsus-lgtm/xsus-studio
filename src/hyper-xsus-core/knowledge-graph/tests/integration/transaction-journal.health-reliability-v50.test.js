import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readFile,stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";
import { createPersistentJournalHealthHistory,PERSISTENT_HEALTH_HISTORY_VERSION } from "../../integration/transaction-journal-health-persistence.js";
import { createTransactionJournalHealthHistory } from "../../integration/transaction-journal-health-history.js";

const report=(i)=>({
  level:i%3===0?"attention":"healthy",journalStatus:"healthy",
  revision:null,warnings:i%3===0?["HEALTH_CHECK"]:[],
  transactionCounts:{running:0,completed:i,failed:0,interrupted:0},
});
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-reliability-v50-"));
  const filePath=join(dir,"history.json");
  try{await run(filePath);}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — Health History Reliability Milestone v5.0.0",()=>{
  it("retains exact bounded snapshots across fresh instances and stable SHA-256 reads",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath,maxEntries:5});
      try{
        for(let i=1;i<=12;i++)await store.append(report(i),{timestamp:i});
      }finally{await store.close();}
      const before=await readFile(filePath,"utf8");
      expect(JSON.parse(before).version).toBe(PERSISTENT_HEALTH_HISTORY_VERSION);
      expect(JSON.parse(before).entries.map(x=>x.timestamp)).toEqual([8,9,10,11,12]);
      const digest=createHash("sha256").update(before).digest("hex");
      const restarted=createPersistentJournalHealthHistory({filePath,maxEntries:5});
      try{
        const loaded=await restarted.load();
        expect(loaded.map(x=>x.timestamp)).toEqual([8,9,10,11,12]);
        expect(loaded.map(x=>x.transactionCounts.completed)).toEqual([8,9,10,11,12]);
        expect(createHash("sha256").update(await readFile(filePath,"utf8")).digest("hex")).toBe(digest);
      }finally{await restarted.close();}
    });
  });
  it("fails closed on competing lock without mutating committed bytes",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath});
      try{
        await store.append(report(1),{timestamp:1});
        const before=await readFile(filePath,"utf8");
        await withExclusiveFileLock(filePath,async()=>{
          await expect(store.append(report(2),{timestamp:2})).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
          expect(await readFile(filePath,"utf8")).toBe(before);
        });
        await store.append(report(3),{timestamp:3});
        expect((await store.load()).map(x=>x.timestamp)).toEqual([1,3]);
        await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
      }finally{await store.close();}
    });
  });
  it("preserves v4.3 immutable in-memory snapshots independently of persisted copies",async()=>{
    const history=createTransactionJournalHealthHistory({maxEntries:2});
    const source=report(3);
    const snapshot=history.record(source,{timestamp:3});
    source.warnings.push("LATER_CHANGE");
    source.transactionCounts.completed=999;
    expect(snapshot.warnings).toEqual(["HEALTH_CHECK"]);
    expect(snapshot.transactionCounts.completed).toBe(3);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.warnings)).toBe(true);
    expect(Object.isFrozen(snapshot.transactionCounts)).toBe(true);
    expect(history.list()).toEqual([snapshot]);
  });
});
