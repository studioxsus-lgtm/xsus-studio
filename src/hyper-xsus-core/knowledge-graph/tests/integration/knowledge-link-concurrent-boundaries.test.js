import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";

const makeLink = (i) => ({
  id: `concurrent-${i}`,
  sourceId: `node-${i % 20}`,
  targetId: `node-${(i % 20) + 1}`,
  relationType: "supports",
  confidence: 0.9,
});

describe("Hyper XSUS Core — concurrent integration boundaries", () => {
  it("preserves all links across interleaved asynchronous producers", async () => {
    const links = createKnowledgeLinkAPI();
    const graph = createKnowledgeGraphAPI({ id: "concurrent-producers" });
    try {
      graph.addNodes(Array.from({ length: 21 }, (_, i) => ({ id: `node-${i}` })));
      const total = 200;
      // Each producer yields once; synchronous API operations remain serialized
      // by the JS event loop. This is interleaving, not multithreaded execution.
      await Promise.all(Array.from({ length: 4 }, async (_, worker) => {
        await Promise.resolve();
        for (let i = worker; i < total; i += 4) {
          links.add(makeLink(i));
        }
      }));
      expect(links.find().count).toBe(total);
      graph.addLinks(links.find().links);
      expect(graph.getStatus().linkCount).toBe(total);
      expect(graph.verifyIntegrity().valid).toBe(true);
      links.rebuildIndexes();
      expect(links.find().count).toBe(total);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("keeps the graph independent when a link producer fails validation", async () => {
    const links = createKnowledgeLinkAPI();
    const graph = createKnowledgeGraphAPI({ id: "concurrent-failure" });
    try {
      graph.addNodes([{ id: "A" }, { id: "B" }]);
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => links.add({
          id: "valid", sourceId: "A", targetId: "B",
          relationType: "supports", confidence: 0.9,
        })),
        Promise.resolve().then(() => links.add({
          id: "invalid", sourceId: "", targetId: "B",
          relationType: "supports", confidence: 0.9,
        })),
      ]);
      expect(outcomes.map((item) => item.status)).toEqual(["fulfilled", "rejected"]);
      expect(links.find().count).toBe(1);
      expect(graph.getStatus().linkCount).toBe(0);
      graph.addLink(links.getById("valid"));
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });
});
