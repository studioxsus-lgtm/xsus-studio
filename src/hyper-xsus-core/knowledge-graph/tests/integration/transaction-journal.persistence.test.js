import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-journal-"));
  const filePath = join(dir, "journal.json");
  try { await run(filePath); } finally { await rm(dir, { recursive: true, force: true }); }
}
const entry = (id, state = "running") => ({ id, state, attempted: 2, added: 0 });

describe("Transaction Journal Persistence", () => {
  it("saves and restores a journal across store instances", async () => {
    await fixture(async (filePath) => {
      const first = createTransactionJournalStore({ filePath });
      await first.save([entry(1, "completed")]);
      await first.close();
      const second = createTransactionJournalStore({ filePath });
      expect(await second.load()).toEqual([entry(1, "completed")]);
      await second.close();
    });
  });

  it("marks interrupted running operations without modifying completed ones", async () => {
    await fixture(async (filePath) => {
      const store = createTransactionJournalStore({ filePath });
      await store.save([entry(1), entry(2, "completed")]);
      expect((await store.recoverInterrupted()).map((item) => item.state))
        .toEqual(["interrupted", "completed"]);
      expect((await store.load())[0].state).toBe("interrupted");
      await store.close();
    });
  });

  it("serializes concurrent save requests in invocation order", async () => {
    await fixture(async (filePath) => {
      const store = createTransactionJournalStore({ filePath });
      await Promise.all([store.save([entry(1)]), store.save([entry(2, "failed")])]);
      expect(await store.load()).toEqual([entry(2, "failed")]);
      expect(JSON.parse(await readFile(filePath, "utf8")).entries).toHaveLength(1);
      await store.close();
    });
  });

  it("rejects invalid journal entries before writing", async () => {
    await fixture(async (filePath) => {
      const store = createTransactionJournalStore({ filePath });
      expect(() => store.save([{ id: 1, state: "unknown", attempted: 0, added: 0 }]))
        .toThrow(TypeError);
      expect(await store.load()).toEqual([]);
      await store.close();
    });
  });
});
