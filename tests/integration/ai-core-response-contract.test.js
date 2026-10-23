
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
  searchKnowledge: vi.fn()
}));

import { searchKnowledge } from "../../src/knowledge/knowledge-service.js";
import { processAIRequest } from "../../src/core/ai-core.js";
import { clearAllMemory } from "../../src/core/memory-engine.js";

describe("XSUS AI Core — Response Contract", () => {
  afterEach(() => {
    vi.resetAllMocks();
    clearAllMemory();
  });

  test("përgjigjja e suksesshme ruan kontratën standarde", async () => {
    searchKnowledge.mockResolvedValueOnce({
      success: true,
      results: [
        {
          title: "Programimi",
          content: "Programimi është procesi i krijimit të udhëzimeve për kompjuterin.",
          source: "test-knowledge"
        }
      ],
      sources: ["test-knowledge"],
      errors: [],
      metadata: {}
    });

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq",
      conversationId: "response-contract-success"
    });

    expect(result.error).toBeUndefined();
    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.requestId).toEqual(expect.any(String));
    expect(result.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(result.version).toBe("1.2.0");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(Array.isArray(result.metadata.sources)).toBe(true);
  });

  test("gabimi ruan strukturën standarde të përgjigjes", async () => {
    searchKnowledge.mockRejectedValueOnce(
      new Error("Private internal error detail")
    );

    const result = await processAIRequest({
      query: "Pyetje për testimin e gabimit",
      language: "sq",
      conversationId: "response-contract-error"
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("answer", "");
    expect(result).toHaveProperty("error");
    expect(result.requestId).toEqual(expect.any(String));
    expect(result.timestamp).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(result.version).toBe("1.2.0");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.error).not.toContain("Private internal error detail");
  });
});
