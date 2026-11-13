import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";
import { createKnowledgePropagationCoordinator } from "../../integration/knowledge-propagation.coordinator.js";
import { createTransactionJournalStore } from "../../integration/transaction-journal.persistence.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-durable-"));
  const store = createTransactionJournalStore({ filePath: join(dir, "journal.json") });
  const links = createKnowledgeLinkAPI();
  const graph = createKnowledgeGraphAPI({ id: "durable-test" });
  graph.addNodes([{ id: "A" }, { id: "B" }]);
  const coordinator = createKnowledgePropagationCoordinator({ links, graph, journalStore: store });
  try { await run({ store, links, graph, coordinator }); }
  finally {
    coordinator.close();
    graph.close();
    links.close();
    await store.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const link = (id, targetId = "B") => ({
  id, sourceId: "A", targetId, relationType: "supports", confidence: 0.9,
});

describe("Durable propagation coordinator", () => {
  it("persists a completed operation", async () => {
    await fixture(async ({ links, coordinator, store }) => {
      links.add(link("AB"));
      expect(await coordinator.reconcileDurable()).toMatchObject({ state: "completed", added: 1 });
      expect((await store.load())[0].state).toBe("completed");
    });
  });

  it("persists failed propagation without losing source links", async () => {
    await fixture(async ({ links, graph, coordinator, store }) => {
      links.add(link("AX", "X"));
      await expect(coordinator.reconcileDurable()).rejects.toThrow();
      expect((await store.load())[0].state).toBe("failed");
      expect(graph.getStatus().linkCount).toBe(0);
      expect(links.getById("AX")).toBeTruthy();
    });
  });

  it("retries after a missing node is corrected without duplication", async () => {
    await fixture(async ({ links, graph, coordinator }) => {
      links.add(link("AX", "X"));
      await expect(coordinator.reconcileDurable()).rejects.toThrow();
      graph.addNode({ id: "X" });
      expect((await coordinator.reconcileDurable()).added).toBe(1);
      expect((await coordinator.reconcileDurable()).added).toBe(0);
      expect(graph.getStatus().linkCount).toBe(1);
    });
  });

  it("marks interrupted operations and advances journal sequence", async () => {
    await fixture(async ({ coordinator, store }) => {
      await store.save([{ id: 9, state: "running", attempted: 1, added: 0 }]);
      expect((await coordinator.recoverDurable())[0].state).toBe("interrupted");
      expect((await coordinator.reconcileDurable()).id).toBe(10);
    });
  });

  it("preserves synchronous reconciliation compatibility", async () => {
    await fixture(async ({ links, coordinator, graph }) => {
      links.add(link("AB"));
      expect(coordinator.reconcile().added).toBe(1);
      expect(graph.getStatus().linkCount).toBe(1);
    });
  });
});
