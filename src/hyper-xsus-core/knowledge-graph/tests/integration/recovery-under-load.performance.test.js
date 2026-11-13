import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-load-"));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
const entry = (id, state) => ({ id, state, attempted: 1, added: state === "completed" ? 1 : 0 });
const elapsed = async (fn) => {
  const start = performance.now();
  const result = await fn();
  return { result, durationMs: Math.round((performance.now() - start) * 100) / 100 };
};

describe("Hyper XSUS Core — recovery under load and timing diagnostics", () => {
  it("avoids rewriting an unchanged completed journal during recovery", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        const entries = Array.from({ length: 1000 }, (_, i) => entry(i + 1, "completed"));
        await store.save(entries);
        const before = await readFile(path);
        const metadata = await stat(path);
        expect(await store.recoverInterrupted()).toEqual(entries);
        expect(await readFile(path)).toEqual(before);
        expect((await stat(path)).ino).toBe(metadata.ino);
      } finally { await store.close(); }
    });
  }, 30000);

  it("recovers 10000 interrupted and completed entries without changing completed records", async () => {
    await fixture(async (dir) => {
      const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
      try {
        const entries = Array.from({ length: 10000 }, (_, i) =>
          entry(i + 1, i % 4 === 0 ? "running" : "completed"));
        await store.save(entries);
        const { result, durationMs } = await elapsed(() => store.recoverInterrupted());
        expect(result).toHaveLength(10000);
        expect(result.filter((e) => e.state === "interrupted")).toHaveLength(2500);
        expect(result.filter((e) => e.state === "completed")).toHaveLength(7500);
        expect(await store.load()).toEqual(result);
        // Diagnostics only: no machine-dependent speed threshold.
        console.info("XSUS recovery 10000 entries (ms):", durationMs);
      } finally { await store.close(); }
    });
  }, 60000);

  it("recovers again without generating another journal write", async () => {
    await fixture(async (dir) => {
      const path = join(dir, "journal.json");
      const store = createTransactionJournalStore({ filePath: path });
      try {
        await store.save([entry(1, "running"), entry(2, "completed")]);
        await store.recoverInterrupted();
        const before = await stat(path);
        const result = await store.recoverInterrupted();
        expect(result.map((e) => e.state)).toEqual(["interrupted", "completed"]);
        expect((await stat(path)).ino).toBe(before.ino);
      } finally { await store.close(); }
    });
  }, 30000);

  it("measures graph snapshot read/write without asserting environment-dependent latency", async () => {
    await fixture(async (dir) => {
      const store = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
      const nodes = Array.from({ length: 2000 }, (_, i) => ({ id: `n-${i}` }));
      const links = Array.from({ length: 1999 }, (_, i) => ({
        id: `l-${i}`, sourceId: `n-${i}`,
        targetId: `n-${i + 1}`, relationType: "supports",
      }));
      try {
        const write = await elapsed(() => store.save({ nodes, links }));
        const read = await elapsed(() => store.load());
        expect(read.result.nodes).toHaveLength(2000);
        expect(read.result.links).toHaveLength(1999);
        console.info("XSUS graph snapshot timing (ms):", {
          write: write.durationMs, read: read.durationMs,
        });
      } finally { await store.close(); }
    });
  }, 30000);
});
