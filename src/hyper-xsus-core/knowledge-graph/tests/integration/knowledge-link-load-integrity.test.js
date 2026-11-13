import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";

describe("Hyper XSUS Core — cross-engine load integrity", () => {
  it.each([1000, 5000, 10000])(
    "preserves independent link and graph integrity for %i links",
    (size) => {
      const links = createKnowledgeLinkAPI();
      const graph = createKnowledgeGraphAPI({ id: `load-integrity-${size}` });
      try {
        const nodes = Array.from({ length: 101 }, (_, i) => ({
          id: `node-${i}`,
        }));
        graph.addNodes(nodes);
        const batch = Array.from({ length: size }, (_, i) => ({
          id: `load-link-${i}`,
          sourceId: `node-${i % 100}`,
          targetId: `node-${(i % 100) + 1}`,
          relationType: "supports",
          confidence: 0.9,
        }));
        links.addMany(batch);
        expect(links.find().count).toBe(size);
        for (const item of links.find().links) {
          graph.addLink(item);
        }
        expect(graph.getStatus().linkCount).toBe(size);
        expect(graph.verifyIntegrity().valid).toBe(true);
        links.rebuildIndexes();
        expect(links.find().count).toBe(size);
        expect(graph.verifyIntegrity().valid).toBe(true);
      } finally {
        graph.close();
        links.close();
      }
    },
    120000,
  );
});
