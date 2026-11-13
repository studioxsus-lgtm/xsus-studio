import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { createTransactionJournalHealthReport, TRANSACTION_JOURNAL_HEALTH_REPORT_VERSION } from "../../integration/transaction-journal-health-report.js";

async function fixture(run) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-journal-health-v42-"));
  const filePath=join(dir,"journal.json");
  try {await run({dir,filePath});}
  finally {await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — transaction journal health reporting v4.2.0",()=>{
  it("reports missing journal as unknown without creating files",async()=>{
    await fixture(async({dir,filePath})=>{
      const report=await createTransactionJournalHealthReport(filePath);
      expect(report).toMatchObject({reportVersion:TRANSACTION_JOURNAL_HEALTH_REPORT_VERSION,level:"unknown",journalStatus:"missing",warnings:["JOURNAL_MISSING"],readOnly:true,advisory:true});
      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.warnings)).toBe(true);
      expect(await readdir(dir)).toEqual([]);
    });
  });
  it("reports a healthy empty committed journal",async()=>{
    await fixture(async({filePath})=>{
      const store=createTransactionJournalStore({filePath,exclusiveLock:true});
      try {await store.save([]);} finally {await store.close();}
      const before=await readFile(filePath,"utf8");
      const report=await createTransactionJournalHealthReport(filePath);
      expect(report).toMatchObject({level:"healthy",journalStatus:"healthy",transactionCount:0,transactionCounts:{running:0,completed:0,failed:0,interrupted:0},warnings:[]});
      expect(await readFile(filePath,"utf8")).toBe(before);
    });
  });
  it("reports running, failed, and interrupted states without treating them as corruption",async()=>{
    await fixture(async({filePath})=>{
      const store=createTransactionJournalStore({filePath,exclusiveLock:true});
      try {await store.save([
        {id:1,state:"running",attempted:2,added:1},
        {id:2,state:"failed",attempted:2,added:0},
        {id:3,state:"interrupted",attempted:2,added:1},
        {id:4,state:"completed",attempted:1,added:1},
      ]);} finally {await store.close();}
      const report=await createTransactionJournalHealthReport(filePath);
      expect(report).toMatchObject({level:"attention",journalStatus:"healthy",transactionCount:4,transactionCounts:{running:1,failed:1,interrupted:1,completed:1},warnings:["RUNNING_TRANSACTIONS_PRESENT","FAILED_TRANSACTIONS_PRESENT","INTERRUPTED_TRANSACTIONS_PRESENT"]});
    });
  });
  it("reports malformed committed bytes as critical without rewriting them",async()=>{
    await fixture(async({filePath})=>{
      const broken='{"version":"0.1.0","entries":[';
      await writeFile(filePath,broken);
      const report=await createTransactionJournalHealthReport(filePath);
      expect(report).toMatchObject({level:"critical",journalStatus:"invalid",warnings:["JOURNAL_INVALID"],errorCode:"INVALID_JSON"});
      expect(await readFile(filePath,"utf8")).toBe(broken);
    });
  });
  it("flags lock and temporary file presence without cleanup or asserting orphan ownership",async()=>{
    await fixture(async({dir,filePath})=>{
      const lock=filePath+".lock";
      const tmp=join(dir,".journal.json.123e4567-e89b-42d3-a456-426614174000.tmp");
      await writeFile(lock,"lock");
      await writeFile(tmp,"temp");
      const before=await readdir(dir);
      const report=await createTransactionJournalHealthReport(filePath,{minimumAgeMs:0});
      expect(report).toMatchObject({level:"unknown",lockPresent:true,temporaryFileCount:1,warnings:["JOURNAL_MISSING","LOCK_PRESENT_UNVERIFIED","TEMPORARY_FILES_PRESENT"],cleanupPerformed:false});
      expect(await readdir(dir)).toEqual(before);
      expect(await readFile(lock,"utf8")).toBe("lock");
      expect(await readFile(tmp,"utf8")).toBe("temp");
    });
  });
});
