
import { describe, it, expect, vi } from "vitest";

import {
  createKnowledgeRetrievalRouter
} from "../../src/core/knowledge-retrieval-router.js";

describe("Knowledge Retrieval Router v1.0.0", () => {
  it("uses Hyper XSUS Core when results exist", async () => {
    const fallbackSearch = vi.fn();

    const router = createKnowledgeRetrievalRouter({
      hyperAdapter: {
        retrieve: vi.fn().mockReturnValue({
          count: 1,
          results: [
            { id: "python_variables", content: "Python variables." }
          ]
        })
      },
      fallbackSearch
    });

    const result = await router.retrieve(
      "python variables",
      { language: "en" }
    );

    expect(result.source).toBe("hyper-xsus-core");
    expect(result.count).toBe(1);
    expect(fallbackSearch).not.toHaveBeenCalled();
  });

  it("uses fallback when Hyper has no results", async () => {
    const router = createKnowledgeRetrievalRouter({
      hyperAdapter: {
        retrieve: vi.fn().mockReturnValue({
          count: 0,
          results: []
        })
      },
      fallbackSearch: vi.fn().mockResolvedValue({
        success: true,
        results: [
          { id: "fallback_1", content: "Fallback knowledge." }
        ]
      })
    });

    const result = await router.retrieve("python", {
      language: "en"
    });

    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.fallbackUsed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("uses fallback when Hyper throws", async () => {
    const router = createKnowledgeRetrievalRouter({
      hyperAdapter: {
        retrieve: vi.fn().mockRejectedValue(
          new Error("Hyper unavailable")
        )
      },
      fallbackSearch: vi.fn().mockResolvedValue([
        { id: "fallback_1", content: "Fallback knowledge." }
      ])
    });

    const result = await router.retrieve("python");

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("returns failure when both retrieval systems fail", async () => {
    const router = createKnowledgeRetrievalRouter({
      hyperAdapter: {
        retrieve: vi.fn().mockRejectedValue(
          new Error("Hyper unavailable")
        )
      },
      fallbackSearch: vi.fn().mockRejectedValue(
        new Error("Fallback unavailable")
      )
    });

    const result = await router.retrieve("python");

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe("knowledge-retrieval-failed");
  });

  it("rejects invalid queries", async () => {
    const router = createKnowledgeRetrievalRouter();

    await expect(router.retrieve(""))
      .rejects.toThrow(TypeError);

    await expect(router.retrieve(null))
      .rejects.toThrow(TypeError);
  });

  it("rejects invalid limits", async () => {
    const router = createKnowledgeRetrievalRouter();

    await expect(
      router.retrieve("python", { limit: 0 })
    ).rejects.toThrow(TypeError);
  });

  it("closes safely and rejects subsequent operations", () => {
    const router = createKnowledgeRetrievalRouter();

    expect(() => router.close()).not.toThrow();
    expect(() => router.close()).not.toThrow();

    expect(() => router.getStatus()).toThrow(
      "Knowledge Retrieval Router is closed."
    );
  });
});
