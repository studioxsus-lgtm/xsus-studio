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

const link = (id, sourceId = "A", targetId = "B") => ({
  id, sourceId, targetId, relationType: "supports", confidence: 0.9,
});

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-recovery-faults-"));
  const snapshotStore = createGraphSnapshotStore({ filePath: join(dir, "graph.json") });
  const journalStore = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
  const links = createKnowledgeLinkAPI();
  const graphs = [];
  const coordinators = [];
  function graph() {
    const value = createKnowledgeGraphAPI({ id: `fault-${graphs.length}` });
    graphs.push(value);
    return value;
  }
  function recovery(target, overrides = {}) {
    const coordinator = createKnowledgePropagationCoordinator({
      links, graph: target, journalStore: overrides.journalStore ?? journalStore,
    });
    coordinators.push(coordinator);
    return createUnifiedCrashRecovery({
      graph: target, links, snapshotStore: overrides.snapshotStore ?? snapshotStore,
      journalStore: overrides.journalStore ?? journalStore,
      coordinator,
    });
  }
  try { await run({ links, graph, recovery, snapshotStore, journalStore }); }
  finally {
    coordinators.forEach((item) => item.close());
    graphs.forEach((item) => item.close());
    links.close();
    await snapshotStore.close();
    await journalStore.close();
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Unified Crash Recovery — fault injection", () => {
  it("preserves the previous snapshot if the final snapshot save fails", async () => {
    await fixture(async ({ links, graph, recovery, snapshotStore }) => {
      const original = graph();
      original.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(original.getGraph());
      links.add(link("AB"));
      const target = graph();
      const failingStore = {
        restoreInto: (...args) => snapshotStore.restoreInto(...args),
        save: async () => { throw new Error("snapshot write unavailable"); },
      };
      await expect(recovery(target, { snapshotStore: failingStore }).recover())
        .rejects.toThrow("snapshot write unavailable");
      expect(target.getStatus().linkCount).toBe(1);
      expect((await snapshotStore.load()).links).toHaveLength(0);
      expect(target.verifyIntegrity().valid).toBe(true);
    });
  });

  it("recovers from a failed final snapshot save using a fresh graph", async () => {
    await fixture(async ({ links, graph, recovery, snapshotStore }) => {
      const original = graph();
      original.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(original.getGraph());
      links.add(link("AB"));
      const failingStore = {
        restoreInto: (...args) => snapshotStore.restoreInto(...args),
        save: async () => { throw new Error("injected snapshot failure"); },
      };
      await expect(recovery(graph(), { snapshotStore: failingStore }).recover())
        .rejects.toThrow("injected snapshot failure");
      const fresh = graph();
      const result = await recovery(fresh).recover();
      expect(result.linksAdded).toBe(1);
      expect(fresh.getStatus().linkCount).toBe(1);
      expect((await snapshotStore.load()).links).toHaveLength(1);
    });
  });

  it("does not mutate an empty graph when snapshot restoration fails", async () => {
    await fixture(async ({ graph, recovery }) => {
      const target = graph();
      const failingStore = {
        restoreInto: async () => { throw new Error("snapshot unreadable"); },
        save: async () => {},
      };
      await expect(recovery(target, { snapshotStore: failingStore }).recover())
        .rejects.toThrow("snapshot unreadable");
      expect(target.getStatus()).toMatchObject({ nodeCount: 0, linkCount: 0 });
    });
  });

  it("stops before propagation when interrupted journal recovery fails", async () => {
    await fixture(async ({ graph, recovery, snapshotStore, journalStore }) => {
      const original = graph();
      original.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(original.getGraph());
      const failingJournal = {
        save: (...args) => journalStore.save(...args),
        recoverInterrupted: async () => { throw new Error("journal unreadable"); },
      };
      const target = graph();
      await expect(recovery(target, { journalStore: failingJournal }).recover())
        .rejects.toThrow("journal unreadable");
      expect(target.getStatus()).toMatchObject({ nodeCount: 2, linkCount: 0 });
    });
  });

  it("keeps the source intact if journal persistence rejects propagation", async () => {
    await fixture(async ({ links, graph, recovery, snapshotStore, journalStore }) => {
      const original = graph();
      original.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(original.getGraph());
      links.add(link("AB"));
      const failingJournal = {
        recoverInterrupted: (...args) => journalStore.recoverInterrupted(...args),
        save: async () => { throw new Error("journal write unavailable"); },
      };
      const target = graph();
      await expect(recovery(target, { journalStore: failingJournal }).recover())
        .rejects.toThrow();
      expect(links.getById("AB")).toBeTruthy();
      expect(target.getStatus().linkCount).toBe(0);
      expect(target.verifyIntegrity().valid).toBe(true);
    });
  });

  it("does not create duplicates after repeated restart-style reconciliation", async () => {
    await fixture(async ({ links, graph, recovery, snapshotStore }) => {
      const original = graph();
      original.addNodes([{ id: "A" }, { id: "B" }]);
      await snapshotStore.save(original.getGraph());
      links.add(link("AB"));
      const first = graph();
      expect((await recovery(first).recover()).linksAdded).toBe(1);
      const second = graph();
      expect((await recovery(second).recover()).linksAdded).toBe(0);
      expect(second.getStatus().linkCount).toBe(1);
      expect(second.verifyIntegrity().valid).toBe(true);
    });
  });
});
