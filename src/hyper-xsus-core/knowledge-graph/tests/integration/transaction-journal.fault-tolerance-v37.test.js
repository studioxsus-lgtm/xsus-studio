import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

const initial=[
  {id:1,state:"running",attempted:4,added:2},
  {id:2,state:"completed",attempted:3,added:3},
];
const recovered=[{...initial[0],state:"interrupted"},initial[1]];
const updated=[...recovered,{id:3,state:"completed",attempted:1,added:1}];

async function fixture(callback) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-journal-fault-v37-"));
  const filePath=join(dir,"journal.json");
  const store=createTransactionJournalStore({filePath,exclusiveLock:true});
  try {
    await store.save(initial);
    await callback({filePath,store});
  } finally {
    await store.close();
    await rm(dir,{recursive:true,force:true});
  }
}

describe("Hyper XSUS Core — journal fault tolerance v3.7.0",()=>{
  it("fails closed while lock is held and recovers after lock release",async()=>{
    await fixture(async({filePath,store})=>{
      const before=await readFile(filePath,"utf8");
      await withExclusiveFileLock(filePath,async()=>{
        await expect(store.recoverInterrupted()).rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
        await expect(store.saveIfRevision(updated,createHash("sha256").update(before).digest("hex")))
          .rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
        expect(await readFile(filePath,"utf8")).toBe(before);
      });
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const committed=await readFile(filePath,"utf8");
      expect(JSON.parse(committed)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:recovered});
      expect(await store.recoverInterrupted()).toEqual(recovered);
      expect(await readFile(filePath,"utf8")).toBe(committed);
    });
  },30000);

  it("rejects stale revision after recovery and allows a fresh revision to commit",async()=>{
    await fixture(async({filePath,store})=>{
      const old=(await store.loadWithRevision()).revision;
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const afterRecovery=await readFile(filePath,"utf8");
      await expect(store.saveIfRevision(updated,old))
        .rejects.toMatchObject({code:"XSUS_JOURNAL_REVISION_CONFLICT"});
      expect(await readFile(filePath,"utf8")).toBe(afterRecovery);
      const current=(await store.loadWithRevision()).revision;
      expect(current).toBe(createHash("sha256").update(afterRecovery).digest("hex"));
      const next=await store.saveIfRevision(updated,current);
      const raw=await readFile(filePath,"utf8");
      expect(next).toBe(createHash("sha256").update(raw).digest("hex"));
      expect(JSON.parse(raw)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:updated});
    });
  },30000);

  it("rejects corrupt committed bytes without replacing them and can recover after explicit restoration",async()=>{
    await fixture(async({filePath,store})=>{
      const before=await readFile(filePath,"utf8");
      const corrupt='{"version":"0.1.0","entries":[';
      await writeFile(filePath,corrupt,"utf8");
      await expect(store.recoverInterrupted()).rejects.toThrow();
      await expect(store.saveIfRevision(updated,null)).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(corrupt);
      // Restoration is explicit; the journal implementation must never silently overwrite corruption.
      await writeFile(filePath,before,"utf8");
      expect(await store.recoverInterrupted()).toEqual(recovered);
      expect((await store.loadWithRevision()).entries).toEqual(recovered);
    });
  },30000);
});
