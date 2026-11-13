import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const snapshotModule = new URL("../../integration/graph-snapshot.persistence.js", import.meta.url).href;
const journalModule = new URL("../../integration/transaction-journal.persistence.js", import.meta.url).href;

async function child(script, ...args) {
  const result = await exec(process.execPath, ["--input-type=module", "-e", script, ...args], {
    timeout: 20000,
    maxBuffer: 1024 * 1024,
  });
  return result.stdout.trim();
}

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-process-restart-"));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — real Node.js process restart persistence", () => {
  it("restores graph snapshot bytes written by a separate Node process", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "snapshot.json");
      const write = `
        import { createGraphSnapshotStore } from ${JSON.stringify(snapshotModule)};
        const store = createGraphSnapshotStore({ filePath: process.argv[1] });
        await store.save({ nodes: [{ id: "A" }, { id: "B" }], links: [
          { id: "AB", sourceId: "A", targetId: "B", relationType: "supports" }
        ] });
        await store.close();
        process.stdout.write("saved");
      `;
      expect(await child(write, path)).toBe("saved");
      const read = `
        import { createGraphSnapshotStore } from ${JSON.stringify(snapshotModule)};
        const store = createGraphSnapshotStore({ filePath: process.argv[1] });
        const snapshot = await store.load();
        process.stdout.write(JSON.stringify({ nodes: snapshot.nodes.length, links: snapshot.links.length }));
        await store.close();
      `;
      expect(JSON.parse(await child(read, path))).toEqual({ nodes: 2, links: 1 });
    });
  });

  it("marks interrupted journal entries after a separate process starts", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "journal.json");
      const write = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalModule)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        await store.save([{ id: 7, state: "running", attempted: 3, added: 0 }]);
        await store.close();
      `;
      await child(write, path);
      const recover = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalModule)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        const entries = await store.recoverInterrupted();
        process.stdout.write(JSON.stringify(entries));
        await store.close();
      `;
      const entries = JSON.parse(await child(recover, path));
      expect(entries).toMatchObject([{ id: 7, state: "interrupted" }]);
      const verify = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalModule)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        process.stdout.write(JSON.stringify(await store.load()));
        await store.close();
      `;
      expect(JSON.parse(await child(verify, path))[0].state).toBe("interrupted");
    });
  });

  it("preserves a completed journal across independent processes", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "completed.json");
      const write = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalModule)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        await store.save([{ id: 1, state: "completed", attempted: 2, added: 2 }]);
        await store.close();
      `;
      await child(write, path);
      const read = `
        import { createTransactionJournalStore } from ${JSON.stringify(journalModule)};
        const store = createTransactionJournalStore({ filePath: process.argv[1] });
        process.stdout.write(JSON.stringify(await store.recoverInterrupted()));
        await store.close();
      `;
      expect(JSON.parse(await child(read, path))).toEqual([
        { id: 1, state: "completed", attempted: 2, added: 2 },
      ]);
    });
  });
});
