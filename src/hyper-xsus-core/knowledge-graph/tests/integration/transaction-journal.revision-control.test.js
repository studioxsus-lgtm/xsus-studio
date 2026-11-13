import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createTransactionJournalStore, JournalRevisionConflictError,
} from "../../integration/transaction-journal.persistence.js";

const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });
async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-cas-journal-"));
  const path = join(dir, "journal.json");
  const a = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
  const b = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
  try { await run(a, b); }
  finally { await a.close(); await b.close(); await rm(dir, { recursive: true, force: true }); }
}

describe("Transaction Journal — optimistic revision safety", () => {
  it("reports null revision for an absent journal", async () => {
    await fixture(async (a) => {
      expect(await a.loadWithRevision()).toEqual({ entries: [], revision: null });
    });
  });
  it("creates a journal using a null expected revision", async () => {
    await fixture(async (a) => {
      const revision = await a.saveIfRevision([entry(1)], null);
      expect(revision).toMatch(/^[a-f0-9]{64}$/);
      expect(await a.loadWithRevision()).toEqual({ entries: [entry(1)], revision });
    });
  });
  it("rejects a stale revision without overwriting another writer", async () => {
    await fixture(async (a, b) => {
      const first = await a.saveIfRevision([entry(1)], null);
      const stale = await a.loadWithRevision();
      const next = await b.saveIfRevision([entry(1), entry(2)], first);
      expect(next).not.toBe(first);
      await expect(a.saveIfRevision([entry(3)], stale.revision))
        .rejects.toBeInstanceOf(JournalRevisionConflictError);
      expect((await b.load()).map((r) => r.id)).toEqual([1, 2]);
    });
  });
  it("rejects a second attempt to create an existing journal", async () => {
    await fixture(async (a, b) => {
      await a.saveIfRevision([entry(1)], null);
      await expect(b.saveIfRevision([entry(2)], null))
        .rejects.toMatchObject({ code: "XSUS_JOURNAL_REVISION_CONFLICT" });
    });
  });
  it("allows retry after reading the latest revision", async () => {
    await fixture(async (a, b) => {
      await a.saveIfRevision([entry(1)], null);
      const current = await b.loadWithRevision();
      await b.saveIfRevision([...current.entries, entry(2)], current.revision);
      const latest = await a.loadWithRevision();
      await a.saveIfRevision([...latest.entries, entry(3)], latest.revision);
      expect((await b.load()).map((r) => r.id)).toEqual([1, 2, 3]);
    });
  });
  it("requires exclusive locking for compare-and-swap writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-cas-unlocked-"));
    const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
    try {
      await expect(store.saveIfRevision([entry(1)], null))
        .rejects.toThrow("exclusiveLock");
    } finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
  });
});
