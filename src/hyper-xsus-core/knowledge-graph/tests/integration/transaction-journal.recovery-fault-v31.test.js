import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, readdir, rename as realRename, open as realOpen } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const initial = [
  { id: 1, state: "running", attempted: 4, added: 2 },
  { id: 2, state: "completed", attempted: 3, added: 3 },
];
const recovered = [
  { ...initial[0], state: "interrupted" },
  initial[1],
];

async function fixture(test) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-fault-v31-"));
  const filePath = join(dir, "journal.json");
  try {
    const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
    try { await store.save(initial); } finally { await store.close(); }
    await test({ dir, filePath });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

async function retryRecovery(filePath) {
  const store = createTransactionJournalStore({ filePath, exclusiveLock: true });
  try {
    expect(await store.recoverInterrupted()).toEqual(recovered);
    expect(await store.load()).toEqual(recovered);
    const bytes = await readFile(filePath, "utf8");
    expect(JSON.parse(bytes)).toEqual({ version: TRANSACTION_JOURNAL_VERSION, entries: recovered });
    expect(await store.recoverInterrupted()).toEqual(recovered);
    expect(await readFile(filePath, "utf8")).toBe(bytes);
  } finally { await store.close(); }
}

describe("Hyper XSUS Core — recovery atomic-write fault injection v3.1.0", () => {
  it("preserves the prior committed journal if rename fails before replacement", async () => {
    await fixture(async ({ dir, filePath }) => {
      const before = await readFile(filePath, "utf8");
      await expect(writeAtomicJson(filePath, {
        version: TRANSACTION_JOURNAL_VERSION, entries: recovered,
      }, { io: { rename: async () => { throw new Error("INJECTED_BEFORE_RENAME"); } } }))
        .rejects.toThrow("INJECTED_BEFORE_RENAME");
      expect(await readFile(filePath, "utf8")).toBe(before);
      expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
      await retryRecovery(filePath);
    });
  }, 30000);

  it("treats an error after rename as ambiguous and verifies committed bytes before retry", async () => {
    await fixture(async ({ dir, filePath }) => {
      const before = await readFile(filePath, "utf8");
      let renamed = false;
      await expect(writeAtomicJson(filePath, {
        version: TRANSACTION_JOURNAL_VERSION, entries: recovered,
      }, { io: {
        rename: async (source, target) => {
          await realRename(source, target);
          renamed = true;
        },
        open: async (path, flags, mode) => {
          if (renamed && path === dir && flags === "r") {
            throw new Error("INJECTED_DIRECTORY_SYNC_FAILURE");
          }
          return realOpen(path, flags, mode);
        },
      } })).rejects.toThrow("INJECTED_DIRECTORY_SYNC_FAILURE");
      expect(renamed).toBe(true);
      expect(await readFile(filePath, "utf8")).not.toBe(before);
      expect(JSON.parse(await readFile(filePath, "utf8")).entries).toEqual(recovered);
      await retryRecovery(filePath);
    });
  }, 30000);
});
