import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

const hash = (bytes) => createHash("sha256").update(bytes,"utf8").digest("hex");
const running = [
  {id:1,state:"running",attempted:3,added:2},
  {id:2,state:"completed",attempted:2,added:2},
  {id:3,state:"failed",attempted:1,added:0,error:"expected"},
];
const recovered = [{...running[0],state:"interrupted"},running[1],running[2]];

async function withFixture(test) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-journal-milestone-v40-"));
  const filePath=join(dir,"journal.json");
  const store=createTransactionJournalStore({filePath,exclusiveLock:true});
  try {
    await store.save(running);
    await test({filePath,store});
  } finally {
    await store.close();
    await rm(dir,{recursive:true,force:true});
  }
}

describe("Hyper XSUS Core — transaction journal reliability milestone v4.0.0",()=>{
  it("recovers atomically, preserves terminal states, and rejects stale revision after restart",async()=>{
    await withFixture(async({filePath,store})=>{
      const before=await store.loadWithRevision();
      expect(before.entries).toEqual(running);
      const rawBefore=await readFile(filePath,"utf8");
      expect(before.revision).toBe(hash(rawBefore));
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const rawAfter=await readFile(filePath,"utf8");
      expect(JSON.parse(rawAfter)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:recovered});
      expect(rawAfter).not.toBe(rawBefore);
      await expect(store.saveIfRevision(running,before.revision))
        .rejects.toMatchObject({code:"XSUS_JOURNAL_REVISION_CONFLICT"});
      const restarted=createTransactionJournalStore({filePath,exclusiveLock:true});
      try {
        expect(await restarted.loadWithRevision()).toEqual({entries:recovered,revision:hash(rawAfter)});
        expect(await restarted.recoverInterrupted()).toEqual(recovered);
        expect(await readFile(filePath,"utf8")).toBe(rawAfter);
      } finally {await restarted.close();}
    });
  },30000);

  it("fails closed under competing lock and resumes after release without modifying bytes",async()=>{
    await withFixture(async({filePath,store})=>{
      const before=await readFile(filePath,"utf8");
      await withExclusiveFileLock(filePath,async()=>{
        await expect(store.recoverInterrupted())
          .rejects.toMatchObject({code:"XSUS_FILE_LOCK_BUSY"});
        expect(await readFile(filePath,"utf8")).toBe(before);
      });
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const after=await readFile(filePath,"utf8");
      expect((await store.loadWithRevision()).revision).toBe(hash(after));
    });
  },30000);

  it("rejects invalid committed JSON without silent replacement, then permits explicit restoration",async()=>{
    await withFixture(async({filePath,store})=>{
      const before=await readFile(filePath,"utf8");
      const damaged='{"version":"0.1.0","entries":[';
      await writeFile(filePath,damaged,"utf8");
      await expect(store.recoverInterrupted()).rejects.toThrow();
      await expect(store.loadWithRevision()).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(damaged);
      await writeFile(filePath,before,"utf8");
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const restored=await readFile(filePath,"utf8");
      expect((await store.loadWithRevision()).revision).toBe(hash(restored));
    });
  },30000);
});
