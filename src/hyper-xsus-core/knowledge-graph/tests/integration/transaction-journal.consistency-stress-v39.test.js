import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const sha = (raw) => createHash("sha256").update(raw,"utf8").digest("hex");

async function stress(rounds) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-recovery-consistency-v39-"));
  const filePath=join(dir,"journal.json");
  const store=createTransactionJournalStore({filePath,exclusiveLock:true});
  const expected=[{id:1,state:"completed",attempted:1,added:1}];
  try {
    await store.save(expected);
    for(let i=0;i<rounds;i++){
      const id=i+2;
      const running={id,state:"running",attempted:3,added:2};
      const next=[...expected,running];
      const previous=(await store.loadWithRevision()).revision;
      const committedRevision=await store.saveIfRevision(next,previous);
      const before=await readFile(filePath,"utf8");
      expect(committedRevision).toBe(sha(before));
      expect(JSON.parse(before)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:next});
      const recovered=await store.recoverInterrupted();
      const finalEntry={...running,state:"interrupted"};
      expected.push(finalEntry);
      expect(recovered).toEqual(expected);
      const stable=await readFile(filePath,"utf8");
      const snapshot=await store.loadWithRevision();
      expect(snapshot).toEqual({entries:expected,revision:sha(stable)});
      expect(JSON.parse(stable)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:expected});
      expect(await store.recoverInterrupted()).toEqual(expected);
      expect(await readFile(filePath,"utf8")).toBe(stable);
      await expect(store.saveIfRevision(next,committedRevision))
        .rejects.toMatchObject({code:"XSUS_JOURNAL_REVISION_CONFLICT"});
      expect(await readFile(filePath,"utf8")).toBe(stable);
    }
    const finalRaw=await readFile(filePath,"utf8");
    expect(JSON.parse(finalRaw).entries).toHaveLength(rounds+1);
    expect((await store.loadWithRevision()).revision).toBe(sha(finalRaw));
  } finally {
    await store.close();
    await rm(dir,{recursive:true,force:true});
  }
}

describe("Hyper XSUS Core — journal recovery consistency stress v3.9.0",()=>{
  for(const rounds of [100,250,500]){
    it("preserves committed SHA-256 revisions over "+rounds+" save/recover/conflict cycles",
      async()=>{await stress(rounds);},300000);
  }
});
