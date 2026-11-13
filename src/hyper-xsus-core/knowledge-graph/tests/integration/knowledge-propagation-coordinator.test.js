import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";
import { createKnowledgePropagationCoordinator } from "../../integration/knowledge-propagation.coordinator.js";

function setup() {
  const links = createKnowledgeLinkAPI();
  const graph = createKnowledgeGraphAPI({ id: "propagation-coordinator-test" });
  graph.addNodes([{ id: "A" }, { id: "B" }, { id: "C" }]);
  const coordinator = createKnowledgePropagationCoordinator({ links, graph });
  return { links, graph, coordinator };
}

const link = (id, sourceId, targetId) => ({
  id, sourceId, targetId, relationType: "supports", confidence: 0.9,
});

describe("Knowledge Propagation Coordinator", () => {
  it("propagates missing links and records a completed operation", () => {
    const { links, graph, coordinator } = setup();
    try {
      links.add(link("AB", "A", "B"));
      links.add(link("BC", "B", "C"));
      expect(coordinator.reconcile()).toMatchObject({ state: "completed", added: 2 });
      expect(graph.getStatus().linkCount).toBe(2);
      expect(coordinator.status().operations).toHaveLength(1);
    } finally { coordinator.close(); graph.close(); links.close(); }
  });

  it("is idempotent on repeated reconciliation", () => {
    const { links, graph, coordinator } = setup();
    try {
      links.add(link("AB", "A", "B"));
      expect(coordinator.reconcile().added).toBe(1);
      expect(coordinator.reconcile().added).toBe(0);
      expect(graph.getStatus().linkCount).toBe(1);
    } finally { coordinator.close(); graph.close(); links.close(); }
  });

  it("records failure and allows a retry after fixing the missing node", () => {
    const { links, graph, coordinator } = setup();
    try {
      links.add(link("AX", "A", "X"));
      expect(() => coordinator.reconcile()).toThrow();
      expect(coordinator.status().operations[0].state).toBe("failed");
      expect(graph.getStatus().linkCount).toBe(0);
      graph.addNode({ id: "X" });
      expect(coordinator.reconcile()).toMatchObject({ state: "completed", added: 1 });
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally { coordinator.close(); graph.close(); links.close(); }
  });
});
