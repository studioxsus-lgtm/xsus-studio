
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
  searchKnowledge: vi.fn()
}));

import { searchKnowledge } from "../../src/knowledge/knowledge-service.js";
import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Knowledge Service Failure", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test("trajton dështimin e shërbimit të njohurive pa rrëzuar procesin", async () => {
    searchKnowledge.mockRejectedValue(
      new Error("Internal database connection details")
    );

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq",
      conversationId: "knowledge-failure-test-001"
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("answer");
    expect(typeof result.answer).toBe("string");

    if (result.error) {
      expect(result.answer).toBe("");
      expect(result.error).not.toContain(
        "Internal database connection details"
      );
    }

    expect(searchKnowledge).toHaveBeenCalledOnce();
  });
});
