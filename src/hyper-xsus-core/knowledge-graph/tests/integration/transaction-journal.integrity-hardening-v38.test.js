import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const sha = (raw) => createHash("sha256").update(raw,"utf8").digest("hex");
const initial = [
  {id:1,state:"running",attempted:4,added:2},
  {id:2,state:"completed",attempted:3,added:3},
  {id:3,state:"failed",attempted:1,added:0,error:"expected"},
];
const recovered = [{...initial[0],state:"interrupted"},initial[1],initial[2]];

async function fixture(callback) {
  const dir=await mkdtemp(join(tmpdir(),"xsus-journal-hardening-v38-"));
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

describe("Hyper XSUS Core — journal integrity hardening v3.8.0",()=>{
  it.each([
    ["duplicate transaction IDs",[{...initial[0]}, {...initial[0]}]],
    ["invalid state",[{...initial[0],state:"unknown"}]],
    ["added exceeds attempted",[{...initial[0],added:5}]],
    ["non-array entries",{id:1}],
  ])("rejects %s without modifying committed bytes",async(_label,entries)=>{
    await fixture(async({filePath,store})=>{
      const invalid=JSON.stringify({version:TRANSACTION_JOURNAL_VERSION,entries});
      await writeFile(filePath,invalid,"utf8");
      await expect(store.load()).rejects.toThrow();
      await expect(store.loadWithRevision()).rejects.toThrow();
      await expect(store.recoverInterrupted()).rejects.toThrow();
      await expect(store.saveIfRevision(recovered,sha(invalid))).rejects.toThrow();
      expect(await readFile(filePath,"utf8")).toBe(invalid);
    });
  },30000);

  it("keeps exact committed bytes and revision across 100 idempotent recoveries",async()=>{
    await fixture(async({filePath,store})=>{
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const bytes=await readFile(filePath,"utf8");
      const revision=sha(bytes);
      for(let i=0;i<100;i++){
        expect(await store.recoverInterrupted()).toEqual(recovered);
        expect(await readFile(filePath,"utf8")).toBe(bytes);
        expect(await store.loadWithRevision()).toEqual({entries:recovered,revision});
      }
      expect(JSON.parse(bytes)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:recovered});
    });
  },60000);

  it("preserves committed revision on stale writes and advances only on valid revision",async()=>{
    await fixture(async({filePath,store})=>{
      const original=(await store.loadWithRevision()).revision;
      expect(await store.recoverInterrupted()).toEqual(recovered);
      const stable=await readFile(filePath,"utf8");
      const revision=sha(stable);
      expect(revision).not.toBe(original);
      for(let i=0;i<10;i++){
        await expect(store.saveIfRevision(recovered,original))
          .rejects.toMatchObject({code:"XSUS_JOURNAL_REVISION_CONFLICT"});
        expect(await readFile(filePath,"utf8")).toBe(stable);
      }
      const next=[...recovered,{id:4,state:"completed",attempted:1,added:1}];
      const committedRevision=await store.saveIfRevision(next,revision);
      const committed=await readFile(filePath,"utf8");
      expect(committedRevision).toBe(sha(committed));
      expect(JSON.parse(committed)).toEqual({version:TRANSACTION_JOURNAL_VERSION,entries:next});
      expect(await store.recoverInterrupted()).toEqual(next);
      expect(await readFile(filePath,"utf8")).toBe(committed);
    });
  },30000);
});
