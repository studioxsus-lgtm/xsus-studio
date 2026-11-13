import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKnowledgeGraphAPI } from "../../index.js";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-graph-snapshot-"));
  const filePath = join(dir, "graph.json");
  try { await run(filePath); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
function graph(id) {
  return createKnowledgeGraphAPI({ id });
}
function populate(g) {
  g.addNodes([{ id: "A" }, { id: "B" }, { id: "C" }]);
  g.addLinks([
    { id: "AB", sourceId: "A", targetId: "B", relationType: "supports" },
    { id: "BC", sourceId: "B", targetId: "C", relationType: "supports" },
  ]);
}

describe("Graph Snapshot Persistence", () => {
  it("restores nodes and links into a new graph instance", async () => {
    await fixture(async (filePath) => {
      const first = graph("snapshot-original");
      const store = createGraphSnapshotStore({ filePath });
      const second = graph("snapshot-restored");
      try {
        populate(first);
        await store.save(first.getGraph());
        expect(await store.restoreInto(second)).toBe(true);
        expect(second.getStatus()).toMatchObject({ nodeCount: 3, linkCount: 2 });
        expect(second.verifyIntegrity().valid).toBe(true);
      } finally { first.close(); second.close(); await store.close(); }
    });
  });

  it("returns false when no snapshot exists", async () => {
    await fixture(async (filePath) => {
      const store = createGraphSnapshotStore({ filePath });
      const target = graph("empty-target");
      try { expect(await store.restoreInto(target)).toBe(false); }
      finally { target.close(); await store.close(); }
    });
  });

  it("refuses restoration into a nonempty graph", async () => {
    await fixture(async (filePath) => {
      const store = createGraphSnapshotStore({ filePath });
      const source = graph("source");
      const target = graph("target");
      try {
        populate(source);
        await store.save(source.getGraph());
        target.addNode({ id: "existing" });
        await expect(store.restoreInto(target)).rejects.toThrow("empty");
        expect(target.getStatus().nodeCount).toBe(1);
      } finally { source.close(); target.close(); await store.close(); }
    });
  });

  it("rejects snapshots with missing link endpoints", async () => {
    await fixture(async (filePath) => {
      const store = createGraphSnapshotStore({ filePath });
      try {
        expect(() => store.save({
          nodes: [{ id: "A" }],
          links: [{ id: "bad", sourceId: "A", targetId: "missing" }],
        })).toThrow(TypeError);
        expect(await store.load()).toBeNull();
      } finally { await store.close(); }
    });
  });

  it("serializes writes and restores the last snapshot", async () => {
    await fixture(async (filePath) => {
      const store = createGraphSnapshotStore({ filePath });
      const first = graph("first");
      const second = graph("second");
      try {
        first.addNode({ id: "A" });
        second.addNodes([{ id: "A" }, { id: "B" }]);
        await Promise.all([store.save(first.getGraph()), store.save(second.getGraph())]);
        expect((await store.load()).nodes).toHaveLength(2);
      } finally { first.close(); second.close(); await store.close(); }
    });
  });
});
