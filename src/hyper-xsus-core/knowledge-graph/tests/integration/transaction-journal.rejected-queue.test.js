import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const row = (id, state = "running") => ({ id, state, attempted: 1, added: 0 });
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-journal-queue-"));
  const filePath = join(dir, "journal.json");
  const store = createTransactionJournalStore({ filePath });
  try { await fn(store, filePath); }
  finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
}

describe("Transaction Journal — rejected operation queue", () => {
  it("closes after reporting malformed JSON", async () => {
    await fixture(async (store, path) => {
      await writeFile(path, '{"entries":');
      await expect(store.recoverInterrupted()).rejects.toThrow(SyntaxError);
    });
  });

  it("accepts a valid save after failed recovery", async () => {
    await fixture(async (store, path) => {
      await writeFile(path, '{"entries":');
      await expect(store.recoverInterrupted()).rejects.toThrow(SyntaxError);
      await store.save([row(1, "completed")]);
      expect(await store.load()).toEqual([row(1, "completed")]);
    });
  });

  it("reports both queued failures without poisoning later operations", async () => {
    await fixture(async (store, path) => {
      await writeFile(path, '{"entries":');
      const first = store.recoverInterrupted();
      const second = store.recoverInterrupted();
      await expect(first).rejects.toThrow(SyntaxError);
      await expect(second).rejects.toThrow(SyntaxError);
      await store.save([row(2)]);
      expect(await store.recoverInterrupted()).toEqual([row(2, "interrupted")]);
    });
  });

  it("orders a save after a failed recovery", async () => {
    await fixture(async (store, path) => {
      await writeFile(path, '{"entries":');
      const failed = store.recoverInterrupted();
      const saved = store.save([row(3)]);
      await expect(failed).rejects.toThrow(SyntaxError);
      await saved;
      expect(await store.load()).toEqual([row(3)]);
    });
  });
});
