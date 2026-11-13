import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, readdir, open, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";
import { createTransactionJournalStore, TRANSACTION_JOURNAL_VERSION } from "../../integration/transaction-journal.persistence.js";

const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });
const snapshot = (ids) => ({ version: TRANSACTION_JOURNAL_VERSION, entries: ids.map(entry) });
const fault = (stage) => Object.assign(new Error("injected " + stage), { code: "EIO" });

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-durability-recovery-"));
  const filePath = join(dir, "journal.json");
  try {
    await writeAtomicJson(filePath, snapshot([1]));
    await run({ dir, filePath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function reopen(filePath) {
  const store = createTransactionJournalStore({ filePath });
  try { return await store.load(); }
  finally { await store.close(); }
}
async function temps(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
}

describe("Hyper XSUS Core — simulated durability recovery boundaries v1.7.0", () => {
  it("retains the prior committed snapshot when rename fails", async () => {
    await fixture(async ({ dir, filePath }) => {
      await expect(writeAtomicJson(filePath, snapshot([1, 2]), {
        io: { rename: async () => { throw fault("rename"); } },
      })).rejects.toMatchObject({ code: "EIO" });
      expect(await reopen(filePath)).toEqual([entry(1)]);
      expect(await temps(dir)).toEqual([]);
    });
  });

  it("reopens the new visible snapshot when directory sync fails after rename", async () => {
    await fixture(async ({ dir, filePath }) => {
      await expect(writeAtomicJson(filePath, snapshot([1, 2]), {
        io: { open: async (target, ...args) => {
          const handle = await open(target, ...args);
          if (String(target) !== dir) return handle;
          return {
            sync: async () => { throw fault("directory-sync"); },
            close: () => handle.close(),
          };
        } },
      })).rejects.toMatchObject({ code: "EIO" });
      // Visibility after rename is not a guarantee of power-loss durability.
      expect(await reopen(filePath)).toEqual([entry(1), entry(2)]);
      expect(await temps(dir)).toEqual([]);
    });
  });

  it("ignores an orphan temporary file after a simulated pre-rename crash", async () => {
    await fixture(async ({ dir, filePath }) => {
      const orphan = join(dir, ".journal.json.orphan.tmp");
      // An injected process crash can leave a fully written but uncommitted temp.
      const handle = await open(orphan, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(snapshot([1, 2])), "utf8");
        await handle.sync();
      } finally { await handle.close(); }
      expect(await reopen(filePath)).toEqual([entry(1)]);
      expect(await readFile(orphan, "utf8")).toContain('"entries"');
      // No implicit deletion: cleanup requires a separate, safe policy.
    });
  });

  it("recovers normal writes after an earlier injected rename failure", async () => {
    await fixture(async ({ dir, filePath }) => {
      await expect(writeAtomicJson(filePath, snapshot([1, 2]), {
        io: { rename: async () => { throw fault("rename"); } },
      })).rejects.toMatchObject({ code: "EIO" });
      const store = createTransactionJournalStore({ filePath });
      try {
        await store.save([entry(1), entry(3)]);
      } finally { await store.close(); }
      expect(await reopen(filePath)).toEqual([entry(1), entry(3)]);
      expect(await temps(dir)).toEqual([]);
    });
  });

  it("preserves an existing committed journal when a stray temp contains invalid JSON", async () => {
    await fixture(async ({ dir, filePath }) => {
      const stray = join(dir, ".journal.json.partial.tmp");
      const before = await readFile(filePath);
      const handle = await open(stray, "wx", 0o600);
      try { await handle.writeFile('{"version":'); }
      finally { await handle.close(); }
      expect(await reopen(filePath)).toEqual([entry(1)]);
      expect(await readFile(filePath)).toEqual(before);
    });
  });
});
