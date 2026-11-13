import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";
import { createGraphSnapshotStore } from "../../integration/graph-snapshot.persistence.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";
import { createKnowledgePropagationCoordinator } from "../../integration/knowledge-propagation.coordinator.js";
import { createUnifiedCrashRecovery } from "../../integration/unified-crash-recovery.js";

const link = (id, a, b) => ({
  id, sourceId: a, targetId: b, relationType: "supports", confidence: 0.9,
});
async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-unified-"));
  const snapshotStore = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
  const journalStore = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
  const links = createKnowledgeLinkAPI();
  const graphs = [];
  const coordinators = [];
  function makeGraph() {
    const graph = createKnowledgeGraphAPI({ id: `recovery-${graphs.length}` });
    graphs.push(graph);
    return graph;
  }
  function makeRecovery(graph) {
    const coordinator = createKnowledgePropagationCoordinator({ links, graph, journalStore });
    coordinators.push(coordinator);
    return createUnifiedCrashRecovery({ graph, links, snapshotStore, journalStore, coordinator });
  }
  try { await run({ links, snapshotStore, journalStore, makeGraph, makeRecovery }); }
  finally {
    coordinators.forEach((c) => c.close());
    graphs.forEach((g) => g.close());
    links.close();
    await snapshotStore.close();
    await journalStore.close();
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Unified Crash Recovery", () => {
  it("restores a snapshot then reconciles missing authoritative links", async () => {
    await fixture(async ({ links, snapshotStore, makeGraph, makeRecovery }) => {
      const old = makeGraph();
      old.addNodes([{ id: "A" }, { id: "B" }, { id: "C" }]);
      old.addLink(link("AB", "A", "B"));
      await snapshotStore.save(old.getGraph());
      links.add(link("AB", "A", "B"));
      links.add(link("BC", "B", "C"));
      const fresh = makeGraph();
      const result = await makeRecovery(fresh).recover();
      expect(result).toMatchObject({
        snapshotRestored: true, linksAdded: 1, graphIntegrity: true,
      });
      expect(fresh.getStatus().linkCount).toBe(2);
      expect((await snapshotStore.load()).links).toHaveLength(2);
    });
  });

  it("marks interrupted journal operations before reconciliation", async () => {
    await fixture(async ({ links, snapshotStore, journalStore, makeGraph, makeRecovery }) => {
      const old = makeGraph();
      old.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(old.getGraph());
      await journalStore.save([{ id: 4, state: "running", attempted: 1, added: 0 }]);
      links.add(link("AB", "A", "B"));
      const fresh = makeGraph();
      expect(await makeRecovery(fresh).recover()).toMatchObject({
        interruptedOperations: 1, linksAdded: 1,
      });
      expect((await journalStore.load())[0].state).toBe("interrupted");
      expect((await journalStore.load())[1].id).toBe(5);
    });
  });

  it("rejects recovery into a graph with existing state", async () => {
    await fixture(async ({ makeGraph, makeRecovery }) => {
      const fresh = makeGraph();
      fresh.addNode({ id: "A" });
      await expect(makeRecovery(fresh).recover()).rejects.toThrow("empty");
      expect(fresh.getStatus().nodeCount).toBe(1);
    });
  });

  it("does not repeat a successful recovery on the same instance", async () => {
    await fixture(async ({ snapshotStore, makeGraph, makeRecovery }) => {
      const original = makeGraph();
      original.addNode({ id: "A" });
      await snapshotStore.save(original.getGraph());
      const fresh = makeGraph();
      const recovery = makeRecovery(fresh);
      await recovery.recover();
      await expect(recovery.recover()).rejects.toThrow("already completed");
    });
  });

  it("rejects missing required recovery dependencies", () => {
    expect(() => createUnifiedCrashRecovery({})).toThrow(TypeError);
  });
});
