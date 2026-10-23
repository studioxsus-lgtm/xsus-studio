
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
  searchKnowledge: vi.fn()
}));

import { searchKnowledge } from "../../src/knowledge/knowledge-service.js";
import { processAIRequest } from "../../src/core/ai-core.js";
import { clearAllMemory } from "../../src/core/memory-engine.js";

describe("XSUS AI Core — Knowledge Language Integration", () => {
  afterEach(() => {
    vi.resetAllMocks();
    clearAllMemory();
  });

  test("përcjell te Knowledge Service gjuhën e kërkuar të përgjigjes", async () => {
    searchKnowledge.mockResolvedValueOnce({
      success: true,
      results: [
        {
          title: "Programming",
          content: "Programming is the process of writing instructions for computers.",
          source: "test-knowledge"
        }
      ],
      sources: ["test-knowledge"],
      errors: [],
      metadata: {}
    });

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "en",
      conversationId: "knowledge-language-sq-en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("en");
    expect(searchKnowledge).toHaveBeenCalledOnce();

    const [knowledgeQuery, options] = searchKnowledge.mock.calls[0];

    expect(typeof knowledgeQuery).toBe("string");
    expect(options.language).toBe("en");
  });
});
