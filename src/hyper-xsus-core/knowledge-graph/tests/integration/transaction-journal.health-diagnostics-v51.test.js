import { describe,it,expect } from "vitest";
import { mkdtemp,rm,readFile,writeFile,stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";
import { createPersistentJournalHealthHistory } from "../../integration/transaction-journal-health-persistence.js";
import { diagnosePersistentHealthHistory } from "../../integration/transaction-journal-health-diagnostics.js";

const report={level:"healthy",journalStatus:"healthy",revision:null,warnings:[],transactionCounts:null};
async function fixture(run){
  const dir=await mkdtemp(join(tmpdir(),"xsus-health-diagnostics-v51-"));
  const filePath=join(dir,"health.json");
  try{await run(filePath);}finally{await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — persistent health history diagnostics v5.1.0",()=>{
  it("reports missing history without creating files",async()=>{
    await fixture(async(filePath)=>{
      const result=await diagnosePersistentHealthHistory(filePath);
      expect(result).toMatchObject({version:"5.1.0",status:"missing",revision:null,entryCount:null,lockPresent:false,readOnly:true,cleanupPerformed:false,advisory:true});
      await expect(stat(filePath)).rejects.toMatchObject({code:"ENOENT"});
      await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
    });
  });
  it("reports valid committed history, SHA-256 and latest observation without mutation",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath});
      await store.append(report,{timestamp:10});
      await store.append({...report,level:"attention",warnings:["CHECK"]},{timestamp:20});
      await store.close();
      const before=await readFile(filePath,"utf8");
      const result=await diagnosePersistentHealthHistory(filePath);
      expect(result).toMatchObject({status:"healthy",entryCount:2,firstTimestamp:10,latestTimestamp:20,latestLevel:"attention",lockPresent:false});
      expect(result.revision).toBe(createHash("sha256").update(before).digest("hex"));
      expect(await readFile(filePath,"utf8")).toBe(before);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });
  it("reports corrupt committed bytes without repairing or overwriting them",async()=>{
    await fixture(async(filePath)=>{
      await writeFile(filePath,'{"version":"4.4.0","entries":[',"utf8");
      const before=await readFile(filePath,"utf8");
      const result=await diagnosePersistentHealthHistory(filePath);
      expect(result).toMatchObject({status:"invalid",errorCode:"INVALID_JSON",entryCount:null,revision:null});
      expect(await readFile(filePath,"utf8")).toBe(before);
    });
  });
  it("observes a cooperating lock without stealing it or changing the committed snapshot",async()=>{
    await fixture(async(filePath)=>{
      const store=createPersistentJournalHealthHistory({filePath});
      await store.append(report,{timestamp:1});
      await store.close();
      const before=await readFile(filePath,"utf8");
      await withExclusiveFileLock(filePath,async()=>{
        const result=await diagnosePersistentHealthHistory(filePath);
        expect(result).toMatchObject({status:"healthy",lockPresent:true,entryCount:1});
        expect(await readFile(filePath,"utf8")).toBe(before);
        await stat(filePath+".lock");
      });
      await expect(stat(filePath+".lock")).rejects.toMatchObject({code:"ENOENT"});
    });
  });
});
