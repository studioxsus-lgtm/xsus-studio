import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-fs-fault-"));
  try { await run(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — filesystem fault boundaries v1.5.0", () => {
  it("rejects malformed committed JSON without silently resetting the journal", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const broken = '{"version":';
      await writeFile(path, broken);
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await expect(store.load()).rejects.toBeInstanceOf(SyntaxError);
        expect(await readFile(path, "utf8")).toBe(broken);
      } finally { await store.close(); }
    });
  });

  it("does not overwrite malformed journal during recovery", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const broken = '{"entries":';
      await writeFile(path, broken);
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await expect(store.recoverInterrupted()).rejects.toBeInstanceOf(SyntaxError);
        expect(await readFile(path, "utf8")).toBe(broken);
      } finally { await store.close(); }
    });
  });

  it("rejects an unreadable journal path that is a directory", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      await mkdir(path);
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await expect(store.load()).rejects.toThrow();
      } finally { await store.close(); }
    });
  });

  it("keeps the internal queue usable after a failed save", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "missing-parent", "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        // A directory at the target pathname forces an atomic rename failure.
        await mkdir(join(dir, "missing-parent"));
        await mkdir(path);
        await expect(store.save([entry(1)])).rejects.toThrow();
        await rm(path, { recursive: true, force: true });
        await store.save([entry(2)]);
        expect(await store.load()).toEqual([entry(2)]);
      } finally { await store.close(); }
    });
  });

  it("keeps committed bytes intact when a stale lock blocks a write", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path, exclusiveLock: true });
      try {
        await store.save([entry(1)]);
        const before = await readFile(path);
        await writeFile(path + ".lock", JSON.stringify({ pid: process.pid, token: "external" }));
        await expect(store.save([entry(2)])).rejects.toMatchObject({
          code: "XSUS_FILE_LOCK_BUSY",
        });
        expect(await readFile(path)).toEqual(before);
      } finally { await store.close(); }
    });
  });
});
