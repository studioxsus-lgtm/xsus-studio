import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const entry = (id, state = "running") => ({
  id, state, attempted: 1, added: state === "completed" ? 1 : 0,
});

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-journal-race-"));
  const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
  try { await fn(store); }
  finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
}

describe("Transaction Journal — serialized concurrent recovery", () => {
  it("orders a save before recovery without losing the saved records", async () => {
    await fixture(async (store) => {
      const saved = store.save([entry(1), entry(2, "completed")]);
      const recovery = store.recoverInterrupted();
      await saved;
      expect(await recovery).toEqual([entry(1, "interrupted"), entry(2, "completed")]);
      expect(await store.load()).toEqual(await recovery);
    });
  });

  it("orders a save after recovery without recovery overwriting it", async () => {
    await fixture(async (store) => {
      await store.save([entry(1)]);
      const recovery = store.recoverInterrupted();
      const next = store.save([entry(1, "completed"), entry(2)]);
      expect((await recovery)[0].state).toBe("interrupted");
      await next;
      expect(await store.load()).toEqual([entry(1, "completed"), entry(2)]);
    });
  });

  it("serializes simultaneous recovery calls and remains idempotent", async () => {
    await fixture(async (store) => {
      await store.save([entry(1), entry(2, "completed")]);
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        store.recoverInterrupted()));
      expect(results.every((rows) => rows[0].state === "interrupted")).toBe(true);
      expect(await store.load()).toEqual(results[0]);
    });
  });

  it("handles 100 queued saves followed by recovery", async () => {
    await fixture(async (store) => {
      const pending = Array.from({ length: 100 }, (_, i) =>
        store.save([entry(i + 1)]));
      const recovery = store.recoverInterrupted();
      await Promise.all(pending);
      expect(await recovery).toEqual([entry(100, "interrupted")]);
      expect(await store.load()).toEqual([entry(100, "interrupted")]);
    });
  }, 60000);

  it("handles 1000 entries with interleaved save and recovery", async () => {
    await fixture(async (store) => {
      const batch = Array.from({ length: 1000 }, (_, i) => entry(i + 1));
      const save = store.save(batch);
      const recover = store.recoverInterrupted();
      await save;
      expect((await recover).filter((x) => x.state === "interrupted")).toHaveLength(1000);
      expect(await store.load()).toEqual(await recover);
    });
  }, 30000);

  it("handles 10000 entries while preserving ids and order", async () => {
    await fixture(async (store) => {
      const batch = Array.from({ length: 10000 }, (_, i) =>
        entry(i + 1, i % 2 ? "completed" : "running"));
      const save = store.save(batch);
      const recover = store.recoverInterrupted();
      await save;
      const rows = await recover;
      expect(rows).toHaveLength(10000);
      expect(rows[0]).toEqual(entry(1, "interrupted"));
      expect(rows[9999]).toEqual(entry(10000, "completed"));
      expect(await store.load()).toEqual(rows);
    });
  }, 60000);
});
