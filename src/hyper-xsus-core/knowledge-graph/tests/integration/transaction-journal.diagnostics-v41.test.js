import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { diagnoseTransactionJournal } from "../../integration/transaction-journal-diagnostics.js";

async function fixture(callback) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-journal-diagnostics-v41-"));
  const filePath=join(dir,"journal.json");
  try {await callback({dir,filePath});}
  finally {await rm(dir,{recursive:true,force:true});}
}
describe("Hyper XSUS Core — read-only journal diagnostics v4.1.0",()=>{
  it("reports a missing journal without creating files",async()=>{
    await fixture(async({dir,filePath})=>{
      const result=await diagnoseTransactionJournal(filePath);
      expect(result).toMatchObject({status:"missing",revision:null,entries:0,lockPresent:false,temporaryFileCount:0,readOnly:true,cleanupPerformed:false});
      expect(await readdir(dir)).toEqual([]);
    });
  });
  it("reports validated counts and exact SHA-256 without modifying committed bytes",async()=>{
    await fixture(async({dir,filePath})=>{
      const store=createTransactionJournalStore({filePath,exclusiveLock:true});
      try {await store.save([
        {id:1,state:"running",attempted:2,added:1},
        {id:2,state:"completed",attempted:1,added:1},
        {id:3,state:"failed",attempted:1,added:0},
        {id:4,state:"interrupted",attempted:2,added:1},
      ]);} finally {await store.close();}
      const before=await readFile(filePath,"utf8");
      const files=await readdir(dir);
      const result=await diagnoseTransactionJournal(filePath);
      expect(result).toMatchObject({status:"healthy",entries:4,counts:{running:1,completed:1,failed:1,interrupted:1},revision:createHash("sha256").update(before).digest("hex"),lockPresent:false,readOnly:true});
      expect(await readFile(filePath,"utf8")).toBe(before);
      expect(await readdir(dir)).toEqual(files);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });
  it("fails closed on malformed JSON and does not rewrite it",async()=>{
    await fixture(async({filePath})=>{
      const corrupt='{"version":"0.1.0","entries":[';
      await writeFile(filePath,corrupt);
      expect(await diagnoseTransactionJournal(filePath)).toMatchObject({status:"invalid",errorCode:"INVALID_JSON",revision:null,readOnly:true});
      expect(await readFile(filePath,"utf8")).toBe(corrupt);
    });
  });
  it("detects a lock and temporary candidates without deleting either",async()=>{
    await fixture(async({dir,filePath})=>{
      const lock=filePath+".lock";
      const tmp=join(dir,".journal.json.123e4567-e89b-42d3-a456-426614174000.tmp");
      await writeFile(lock,"test-lock");
      await writeFile(tmp,"temporary");
      const before=await readdir(dir);
      const result=await diagnoseTransactionJournal(filePath,{minimumAgeMs:0});
      expect(result).toMatchObject({status:"missing",lockPresent:true,temporaryFileCount:1,cleanupPerformed:false});
      expect(result.temporaryFiles[0]).toMatchObject({eligibleForReview:true,safeToDeleteAutomatically:false});
      expect(await readdir(dir)).toEqual(before);
      expect(await readFile(lock,"utf8")).toBe("test-lock");
      expect(await readFile(tmp,"utf8")).toBe("temporary");
    });
  });
});
