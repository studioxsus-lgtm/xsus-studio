import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-durability-stress-"));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
const entry = (id, state = "completed") => ({
  id, state, attempted: 1, added: state === "completed" ? 1 : 0,
});
const graph = (n) => ({
  nodes: Array.from({ length: n }, (_, i) => ({ id: `node-${i}` })),
  links: Array.from({ length: Math.max(0, n - 1) }, (_, i) => ({
    id: `link-${i}`, sourceId: `node-${i}`,
    targetId: `node-${i + 1}`, relationType: "supports",
  })),
});

describe("Durability stress — bounded CI regression", () => {
  it("round-trips 1000 journal entries through fsync-backed persistence", async () => {
    await fixture(async (dir) => {
      const filePath = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath });
      const expected = Array.from({ length: 1000 }, (_, i) => entry(i + 1));
      try {
        await store.save(expected);
        expect(await store.load()).toEqual(expected);
        expect((await stat(filePath)).size).toBeGreaterThan(1000);
      } finally { await store.close(); }
    });
  }, 30000);

  it("round-trips 10000 journal entries in a single bounded snapshot", async () => {
    await fixture(async (dir) => {
      const filePath = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath });
      const expected = Array.from({ length: 10000 }, (_, i) => entry(i + 1));
      try {
        await store.save(expected);
        const restored = await store.load();
        expect(restored).toHaveLength(10000);
        expect(restored[0]).toEqual(expected[0]);
        expect(restored.at(-1)).toEqual(expected.at(-1));
      } finally { await store.close(); }
    });
  }, 60000);

  it("serializes 100 queued journal writes and retains the last snapshot", async () => {
    await fixture(async (dir) => {
      const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
      try {
        await Promise.all(Array.from({ length: 100 }, (_, i) => store.save([entry(i + 1)])));
        expect(await store.load()).toEqual([entry(100)]);
        expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
      } finally { await store.close(); }
    });
  }, 60000);

  it("restores 1000 nodes and 999 links from a snapshot", async () => {
    await fixture(async (dir) => {
      const store = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
      try {
        await store.save(graph(1000));
        const restored = await store.load();
        expect(restored.nodes).toHaveLength(1000);
        expect(restored.links).toHaveLength(999);
      } finally { await store.close(); }
    });
  }, 30000);

  it("serializes 100 queued graph snapshots without leaving temp files", async () => {
    await fixture(async (dir) => {
      const store = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
      try {
        await Promise.all(Array.from({ length: 100 }, (_, i) => store.save(graph(i + 1))));
        expect((await store.load()).nodes).toHaveLength(100);
        expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
      } finally { await store.close(); }
    });
  }, 60000);

  it("recovers 500 running entries without changing completed entries", async () => {
    await fixture(async (dir) => {
      const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
      try {
        await store.save(Array.from({ length: 1000 }, (_, i) =>
          entry(i + 1, i % 2 === 0 ? "running" : "completed")));
        const recovered = await store.recoverInterrupted();
        expect(recovered.filter((item) => item.state === "interrupted")).toHaveLength(500);
        expect(recovered.filter((item) => item.state === "completed")).toHaveLength(500);
        expect(await store.load()).toEqual(recovered);
      } finally { await store.close(); }
    });
  }, 30000);
});
