import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

const row = (id, state = "running") => ({
  id, state, attempted: 1, added: state === "completed" ? 1 : 0,
});
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-journal-lock-"));
  const path = join(dir, "journal.json");
  try { await fn(path); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
describe("Transaction Journal — optional exclusive locking", () => {
  it("retains legacy behavior with locking disabled by default", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([row(1)]);
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  });
  it("writes and reads with exclusive locking enabled", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await store.save([row(1)]);
        expect(await store.load()).toEqual([row(1)]);
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  });
  it("rejects a competing save without changing the committed journal", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await store.save([row(1)]);
        await withExclusiveFileLock(path, async () => {
          await expect(store.save([row(2)])).rejects.toMatchObject({
            code: "XSUS_FILE_LOCK_BUSY",
          });
        });
        expect(await store.load()).toEqual([row(1)]);
      } finally { await store.close(); }
    });
  });
  it("rejects recovery while another process holds the lock", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await store.save([row(1)]);
        await withExclusiveFileLock(path, async () => {
          await expect(store.recoverInterrupted()).rejects.toMatchObject({
            code: "XSUS_FILE_LOCK_BUSY",
          });
        });
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  });
  it("rejects load while locked and allows retry after release", async () => {
    await fixture(async (path) => {
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await store.save([row(1)]);
        await withExclusiveFileLock(path, async () => {
          await expect(store.load()).rejects.toMatchObject({
            code: "XSUS_FILE_LOCK_BUSY",
          });
        });
        expect(await store.load()).toEqual([row(1)]);
      } finally { await store.close(); }
    });
  });
  it("validates exclusiveLock option", async () => {
    await fixture(async (path) => {
      expect(() => createTransactionJournalStore({
        filePath: path, exclusiveLock: "yes",
      })).toThrow(TypeError);
    });
  });
});
