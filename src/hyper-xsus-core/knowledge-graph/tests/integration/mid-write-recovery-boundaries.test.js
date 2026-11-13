import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-midwrite-"));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
const snapshot = (id) => ({ nodes: [{ id }], links: [] });
const entry = (id) => ({ id, state: "completed", attempted: 1, added: 1 });

describe("Hyper XSUS Core — incomplete temporary write boundaries", () => {
  it("loads the committed graph snapshot despite a truncated orphan temp file", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        await store.save(snapshot("A"));
        await writeFile(join(dir, `.${basename(path)}.interrupted.tmp`), '{"version":');
        expect(await store.load()).toEqual(snapshot("A"));
        await store.save(snapshot("B"));
        expect(await store.load()).toEqual(snapshot("B"));
      } finally { await store.close(); }
    });
  });

  it("loads the committed transaction journal despite an orphan temp file", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([entry(1)]);
        await writeFile(join(dir, `.${basename(path)}.interrupted.tmp`), '{"entries":');
        expect(await store.load()).toEqual([entry(1)]);
        await store.save([entry(1), entry(2)]);
        expect(await store.load()).toEqual([entry(1), entry(2)]);
      } finally { await store.close(); }
    });
  });

  it("does not silently accept a corrupted primary graph snapshot", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        await store.save(snapshot("A"));
        await writeFile(path, '{"version":');
        await expect(store.load()).rejects.toThrow();
      } finally { await store.close(); }
    });
  });

  it("does not silently accept a corrupted primary journal", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([entry(1)]);
        await writeFile(path, '{"entries":');
        await expect(store.load()).rejects.toThrow();
        await expect(store.recoverInterrupted()).rejects.toThrow();
      } finally { await store.close(); }
    });
  });

  it("does not mistake an orphan temp file for an existing committed snapshot", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        await writeFile(join(dir, `.${basename(path)}.orphan.tmp`), '{"snapshot":');
        expect(await store.load()).toBeNull();
      } finally { await store.close(); }
    });
  });

  it("does not mistake an orphan temp file for an existing committed journal", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await writeFile(join(dir, `.${basename(path)}.orphan.tmp`), '{"entries":');
        expect(await store.load()).toEqual([]);
      } finally { await store.close(); }
    });
  });

  it("leaves a committed snapshot intact when an invalid new snapshot is rejected", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "graph.json");
      const store = createGraphSnapshotStore({ filePath: path });
      try {
        await store.save(snapshot("A"));
        const before = await readFile(path, "utf8");
        expect(() => store.save({ nodes: [{ id: "A" }], links: [
          { id: "broken", sourceId: "A", targetId: "missing" },
        ] })).toThrow(TypeError);
        expect(await readFile(path, "utf8")).toBe(before);
      } finally { await store.close(); }
    });
  });

  it("leaves a committed journal intact when an invalid entry is rejected", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([entry(1)]);
        const before = await readFile(path, "utf8");
        expect(() => store.save([{ ...entry(2), state: "unknown" }])).toThrow(TypeError);
        expect(await readFile(path, "utf8")).toBe(before);
      } finally { await store.close(); }
    });
  });
});
