
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
  createXsusAIKnowledgeAdapter,
} from "../../integrations/xsus-ai.adapter.js";

function createMockAPI() {
  return {
    create: vi.fn((input) => ({
      success: true,
      link: input,
    })),

    addMany: vi.fn((inputs) => ({
      success: true,
      count: inputs.length,
    })),

    getById: vi.fn((id) => ({
      id,
    })),

    find: vi.fn((filters) => ({
      filters,
      results: [],
    })),

    findByStrategy: vi.fn((strategy) => ({
      strategy,
      results: [],
    })),

    findByEntity: vi.fn((entityId) => ({
      entityId,
      results: [],
    })),

    remove: vi.fn((id) => ({
      success: true,
      id,
    })),

    getStatus: vi.fn(() => ({
      status: "active",
    })),

    close: vi.fn(),
  };
}

describe("XSUS AI KnowledgeLink Adapter", () => {
  let api;
  let adapter;

  beforeEach(() => {
    api = createMockAPI();
    adapter = createXsusAIKnowledgeAdapter(api);
  });

  describe("Version and initialization", () => {
    it("exposes the correct version", () => {
      expect(
        XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
      ).toBe("1.0.0");

      expect(adapter.version).toBe("1.0.0");
    });

    it("creates a frozen adapter", () => {
      expect(Object.isFrozen(adapter)).toBe(true);
    });

    it("accepts an API without a version property", () => {
      expect(() =>
        createXsusAIKnowledgeAdapter(api),
      ).not.toThrow();
    });

    it("rejects null API", () => {
      expect(() =>
        createXsusAIKnowledgeAdapter(null),
      ).toThrow(TypeError);
    });

    it("rejects array API", () => {
      expect(() =>
        createXsusAIKnowledgeAdapter([]),
      ).toThrow(TypeError);
    });

    it("rejects API with missing methods", () => {
      expect(() =>
        createXsusAIKnowledgeAdapter({
          create: vi.fn(),
        }),
      ).toThrow(
        "KnowledgeLink API is missing method: addMany.",
      );
    });

    it("rejects API with non-function methods", () => {
      const invalidAPI = {
        ...api,
        find: null,
      };

      expect(() =>
        createXsusAIKnowledgeAdapter(invalidAPI),
      ).toThrow(
        "KnowledgeLink API is missing method: find.",
      );
    });
  });

  describe("API delegation", () => {
    it("delegates createLink", () => {
      const input = {
        sourceId: "entity-a",
        targetId: "entity-b",
      };

      const result = adapter.createLink(input);

      expect(api.create).toHaveBeenCalledWith(input);
      expect(result.success).toBe(true);
      expect(result.link).toBe(input);
    });

    it("delegates addLinks", () => {
      const inputs = [
        { sourceId: "a", targetId: "b" },
        { sourceId: "b", targetId: "c" },
      ];

      const result = adapter.addLinks(inputs);

      expect(api.addMany).toHaveBeenCalledWith(inputs);
      expect(result.count).toBe(2);
    });

    it("delegates getLink", () => {
      const result = adapter.getLink("link-1");

      expect(api.getById).toHaveBeenCalledWith("link-1");
      expect(result.id).toBe("link-1");
    });

    it("delegates findLinks", () => {
      const filters = {
        sourceId: "entity-a",
        relationType: "supports",
      };

      const result = adapter.findLinks(filters);

      expect(api.find).toHaveBeenCalledWith(filters);
      expect(result.filters).toBe(filters);
    });

    it("uses empty filters by default", () => {
      adapter.findLinks();

      expect(api.find).toHaveBeenCalledWith({});
    });

    it("rejects invalid find filters", () => {
      expect(() => adapter.findLinks(null)).toThrow(
        "KnowledgeLink filters must be a plain object.",
      );

      expect(() => adapter.findLinks([])).toThrow(
        "KnowledgeLink filters must be a plain object.",
      );
    });

    it("delegates findByStrategy", () => {
      const strategy = {
        type: "direct",
        filters: {
          sourceId: "entity-a",
        },
      };

      adapter.findByStrategy(strategy);

      expect(api.findByStrategy).toHaveBeenCalledWith(
        strategy,
      );
    });

    it("delegates findRelatedEntities", () => {
      adapter.findRelatedEntities("entity-a");

      expect(api.findByEntity).toHaveBeenCalledWith(
        "entity-a",
      );
    });

    it("delegates removeLink", () => {
      adapter.removeLink("link-1");

      expect(api.remove).toHaveBeenCalledWith("link-1");
    });

    it("delegates getStatus", () => {
      const result = adapter.getStatus();

      expect(api.getStatus).toHaveBeenCalledOnce();
      expect(result.status).toBe("active");
    });

    it("preserves API return values", () => {
      const expected = Object.freeze({
        custom: true,
      });

      api.create.mockReturnValueOnce(expected);

      expect(adapter.createLink({})).toBe(expected);
    });

    it("preserves API errors", () => {
      const error = new Error("API failure");

      api.create.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => adapter.createLink({})).toThrow(error);
    });
  });

  describe("Lifecycle", () => {
    it("closes the adapter", () => {
      adapter.close();

      expect(() => adapter.getStatus()).toThrow(
        "XSUS AI KnowledgeLink adapter is closed.",
      );
    });

    it("allows repeated close calls", () => {
      expect(() => {
        adapter.close();
        adapter.close();
        adapter.close();
      }).not.toThrow();
    });

    it("does not close the underlying API", () => {
      adapter.close();

      expect(api.close).not.toHaveBeenCalled();
    });

    it("does not close the API when adapter is closed", () => {
      adapter.close();

      expect(api.getStatus).not.toHaveBeenCalled();
      expect(api.close).not.toHaveBeenCalled();
    });

    it("rejects all operational methods after close", () => {
      adapter.close();

      const operations = [
        () => adapter.createLink({}),
        () => adapter.addLinks([]),
        () => adapter.getLink("link-1"),
        () => adapter.findLinks({}),
        () => adapter.findByStrategy({}),
        () => adapter.findRelatedEntities("entity-a"),
        () => adapter.removeLink("link-1"),
        () => adapter.getStatus(),
      ];

      for (const operation of operations) {
        expect(operation).toThrow(
          "XSUS AI KnowledgeLink adapter is closed.",
        );
      }
    });

    it("does not call API methods after close", () => {
      adapter.close();

      expect(() => adapter.createLink({})).toThrow();
      expect(() => adapter.findLinks({})).toThrow();

      expect(api.create).not.toHaveBeenCalled();
      expect(api.find).not.toHaveBeenCalled();
    });
  });
});
