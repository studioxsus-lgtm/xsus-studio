
import { describe, it, expect, beforeEach } from "vitest";

import {
  createKnowledgeLinkAPI,
} from "../../public/knowledge-link.api.js";

import {
  createXsusAIKnowledgeAdapter,
} from "../../integrations/xsus-ai.adapter.js";

describe("XSUS AI — Real KnowledgeLink Integration", () => {
  let api;
  let adapter;

  const links = [
    {
      id: "link-001",
      sourceId: "xsus-ai",
      targetId: "knowledge-engine",
      relationType: "implements",
      confidence: 0.99,
      metadata: {
        domain: "technology",
      },
    },
    {
      id: "link-002",
      sourceId: "knowledge-engine",
      targetId: "knowledge-base",
      relationType: "depends_on",
      confidence: 0.95,
      metadata: {
        domain: "knowledge",
      },
    },
    {
      id: "link-003",
      sourceId: "knowledge-base",
      targetId: "xsus-ai",
      relationType: "supports",
      confidence: 0.91,
      metadata: {
        domain: "ai",
      },
    },
  ];

  beforeEach(() => {
    api = createKnowledgeLinkAPI();
    adapter = createXsusAIKnowledgeAdapter(api);
  });

  describe("Real link creation and retrieval", () => {
    it("creates a real KnowledgeLink", () => {
      adapter.createLink(links[0]);

      const result = adapter.getLink("link-001");

      expect(result).toBeDefined();
      expect(result.id).toBe("link-001");
      expect(result.sourceId).toBe("xsus-ai");
      expect(result.targetId).toBe("knowledge-engine");
    });

    it("creates multiple real links", () => {
      adapter.addLinks(links);

      for (const link of links) {
        const result = adapter.getLink(link.id);

        expect(result).toBeDefined();
        expect(result.id).toBe(link.id);
      }
    });

    it("preserves metadata", () => {
      adapter.createLink(links[0]);

      const result = adapter.getLink("link-001");

      expect(result.metadata).toEqual({
        domain: "technology",
      });
    });

    it("preserves confidence values", () => {
      adapter.createLink(links[0]);

      const result = adapter.getLink("link-001");

      expect(result.confidence).toBe(0.99);
    });
  });

  describe("Real search operations", () => {
    beforeEach(() => {
      adapter.addLinks(links);
    });

    it("finds links by sourceId", () => {
      const result = adapter.findLinks({
        sourceId: "xsus-ai",
      });

      expect(result.count).toBe(1);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe("link-001");
    });

    it("finds links by targetId", () => {
      const result = adapter.findLinks({
        targetId: "xsus-ai",
      });

      expect(result.count).toBe(1);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe("link-003");
    });

    it("finds links by relationType", () => {
      const result = adapter.findLinks({
        relationType: "depends_on",
      });

      expect(result.count).toBe(1);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe("link-002");
    });

    it("finds links by entity", () => {
      const result = adapter.findRelatedEntities(
        "knowledge-engine",
      );

      expect(result.count).toBeGreaterThan(0);
      expect(result.links.length).toBeGreaterThan(0);

      expect(
        result.links.some(
          (link) =>
            link.sourceId === "knowledge-engine" ||
            link.targetId === "knowledge-engine",
        ),
      ).toBe(true);
    });

    it("finds links using a real strategy", () => {
      const result = adapter.findByStrategy({
        type: "direct",
        filters: {
          sourceId: "xsus-ai",
        },
      });

      expect(result.count).toBe(1);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].id).toBe("link-001");
    });
  });

  describe("Real lifecycle and integrity", () => {
    beforeEach(() => {
      adapter.addLinks(links);
    });

    it("returns engine status", () => {
      const status = adapter.getStatus();

      expect(status).toBeDefined();
      expect(status).toBeTypeOf("object");
    });

    it("removes a real link", () => {
      adapter.removeLink("link-001");

      expect(adapter.getLink("link-001")).toBeNull();
    });

    it("verifies index integrity", () => {
      expect(() => api.verifyIntegrity()).not.toThrow();
    });

    it("rebuilds indexes", () => {
      expect(() => api.rebuildIndexes()).not.toThrow();
    });

    it("recovers index integrity", () => {
      expect(() => api.recoverIntegrity()).not.toThrow();
    });

    it("keeps the API usable after adapter close", () => {
      adapter.close();

      expect(() => adapter.getStatus()).toThrow();

      expect(api.getById("link-001")).toBeDefined();
    });

    it("clears links through the API", () => {
      api.clear();

      expect(api.getById("link-001")).toBeNull();
      expect(api.getById("link-002")).toBeNull();
      expect(api.getById("link-003")).toBeNull();
    });

    it("closes the real API independently", () => {
      adapter.close();

      expect(() => api.getStatus()).not.toThrow();

      api.close();

      expect(() => api.getById("link-001")).toThrow();
    });
  });
});
