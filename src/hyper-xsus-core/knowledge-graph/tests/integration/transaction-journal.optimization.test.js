import { describe, it, expect } from "vitest";
import { mkdtemp, rm, stat, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-journal-optimized-"));
  const filePath = join(dir, "journal.json");
  const store = createTransactionJournalStore({ filePath });
  try { await fn({ store, filePath, dir }); }
  finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
}
const record = (id, state) => ({
  id, state, attempted: 1, added: state === "completed" ? 1 : 0,
});

describe("Transaction Journal — single-pass recovery regression", () => {
  it("returns an empty journal without creating a file", async () => {
    await fixture(async ({ store, dir }) => {
      expect(await store.recoverInterrupted()).toEqual([]);
      expect(await readdir(dir)).toEqual([]);
    });
  });

  it("does not rewrite a completed journal", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([record(1, "completed")]);
      const before = await stat(filePath);
      const bytes = await readFile(filePath);
      expect(await store.recoverInterrupted()).toEqual([record(1, "completed")]);
      expect((await stat(filePath)).ino).toBe(before.ino);
      expect(await readFile(filePath)).toEqual(bytes);
    });
  });

  it("changes only running entries in mixed states", async () => {
    await fixture(async ({ store }) => {
      const entries = [
        record(1, "running"), record(2, "completed"),
        record(3, "failed"), record(4, "interrupted"),
      ];
      await store.save(entries);
      const restored = await store.recoverInterrupted();
      expect(restored.map((r) => r.state))
        .toEqual(["interrupted", "completed", "failed", "interrupted"]);
      expect(await store.load()).toEqual(restored);
    });
  });

  it("preserves ids and ordering with 10000 mixed records", async () => {
    await fixture(async ({ store }) => {
      const entries = Array.from({ length: 10000 }, (_, i) =>
        record(i + 1, i % 2 === 0 ? "running" : "completed"));
      await store.save(entries);
      const restored = await store.recoverInterrupted();
      expect(restored).toHaveLength(10000);
      expect(restored.filter((r) => r.state === "interrupted")).toHaveLength(5000);
      expect(restored[0].id).toBe(1);
      expect(restored[9999].id).toBe(10000);
      expect(await store.load()).toEqual(restored);
    });
  }, 60000);

  it("is idempotent across multiple recovery calls", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([record(1, "running")]);
      await store.recoverInterrupted();
      const before = await stat(filePath);
      expect(await store.recoverInterrupted()).toEqual([record(1, "interrupted")]);
      expect((await stat(filePath)).ino).toBe(before.ino);
    });
  });

  it("rejects duplicate ids without overwriting the existing journal", async () => {
    await fixture(async ({ store, filePath }) => {
      await store.save([record(1, "completed")]);
      const before = await readFile(filePath);
      expect(() => store.save([record(1, "completed"), record(1, "running")]))
        .toThrow(TypeError);
      expect(await readFile(filePath)).toEqual(before);
    });
  });
});
