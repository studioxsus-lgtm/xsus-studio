import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-fsync-"));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Atomic JSON durability hardening", () => {
  it("writes valid JSON using a synced temp file and directory", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "state.json");
      await writeAtomicJson(path, { version: 1, entries: [1] });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ version: 1, entries: [1] });
      expect(await readdir(dir)).toEqual(["state.json"]);
    });
  });

  it("replaces an existing file without leaving temp files", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "state.json");
      await writeAtomicJson(path, { value: 1 });
      await writeAtomicJson(path, { value: 2 });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ value: 2 });
      expect(await readdir(dir)).toEqual(["state.json"]);
    });
  });

  it("preserves the previous commit when temporary write fails with ENOSPC", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "state.json");
      await writeAtomicJson(path, { value: "previous" });
      const before = await readFile(path, "utf8");
      const fakeHandle = {
        writeFile: async () => { throw Object.assign(new Error("disk full"), { code: "ENOSPC" }); },
        sync: async () => {},
        close: async () => {},
      };
      await expect(writeAtomicJson(path, { value: "new" }, {
        io: { open: async () => fakeHandle },
      })).rejects.toMatchObject({ code: "ENOSPC" });
      expect(await readFile(path, "utf8")).toBe(before);
      expect(await readdir(dir)).toEqual(["state.json"]);
    });
  });

  it("preserves the previous commit when rename fails with EACCES", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "state.json");
      await writeAtomicJson(path, { value: "previous" });
      const before = await readFile(path, "utf8");
      await expect(writeAtomicJson(path, { value: "new" }, {
        io: { rename: async () => { throw Object.assign(new Error("access denied"), { code: "EACCES" }); } },
      })).rejects.toMatchObject({ code: "EACCES" });
      expect(await readFile(path, "utf8")).toBe(before);
      expect(await readdir(dir)).toEqual(["state.json"]);
    });
  });

  it("reports directory sync failure without incorrectly promising rollback", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "state.json");
      let opens = 0;
      const fs = await import("node:fs/promises");
      await expect(writeAtomicJson(path, { value: "renamed" }, {
        io: {
          open: async (...args) => {
            opens += 1;
            if (opens === 2) throw Object.assign(new Error("directory fsync unavailable"), { code: "EIO" });
            return fs.open(...args);
          },
        },
      })).rejects.toMatchObject({ code: "EIO" });
      // Rename already happened: a failed directory fsync is an uncertain
      // durability outcome, not an atomic rollback.
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ value: "renamed" });
    });
  });

  it("keeps graph snapshot public persistence behavior compatible", async () => {
    await fixture(async (dir) => {
      const store = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
      try {
        await store.save({ nodes: [{ id: "A" }], links: [] });
        expect((await store.load()).nodes).toEqual([{ id: "A" }]);
      } finally { await store.close(); }
    });
  });

  it("keeps journal public persistence behavior compatible", async () => {
    await fixture(async (dir) => {
      const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
      try {
        await store.save([{ id: 1, state: "running", attempted: 1, added: 0 }]);
        expect((await store.recoverInterrupted())[0].state).toBe("interrupted");
      } finally { await store.close(); }
    });
  });
});
