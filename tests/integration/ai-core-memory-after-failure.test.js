
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
  searchKnowledge: vi.fn()
}));

import { searchKnowledge } from "../../src/knowledge/knowledge-service.js";
import { processAIRequest } from "../../src/core/ai-core.js";
import {
  clearAllMemory,
  getMemoryHistory
} from "../../src/core/memory-engine.js";

describe("XSUS AI Core — Memory after failure", () => {
  afterEach(() => {
    vi.resetAllMocks();
    clearAllMemory();
  });

  test("ruan integritetin e historikut pas dështimit të njohurive", async () => {
    const conversationId = "memory-after-failure-001";

    searchKnowledge.mockRejectedValueOnce(
      new Error("Internal knowledge service failure")
    );

    const failedResult = await processAIRequest({
      query: "Pyetja e parë e testit",
      language: "sq",
      conversationId
    });

    expect(failedResult).toBeDefined();

    const historyAfterFailure = getMemoryHistory(conversationId);

    expect(
      historyAfterFailure.some(
        (message) => message.content === "Pyetja e parë e testit"
      )
    ).toBe(true);

    expect(
      historyAfterFailure.some(
        (message) =>
          message.content === "Internal knowledge service failure"
      )
    ).toBe(false);

    searchKnowledge.mockResolvedValueOnce({
      success: true,
      results: [
        {
          title: "Përgjigje testuese",
          content: "Shërbimi funksionon përsëri.",
          source: "test"
        }
      ],
      sources: ["test"],
      errors: [],
      metadata: {}
    });

    const recoveredResult = await processAIRequest({
      query: "Pyetja e dytë e testit",
      language: "sq",
      conversationId
    });

    expect(recoveredResult.answer).toBeTruthy();

    const finalHistory = getMemoryHistory(conversationId);

    expect(
      finalHistory.some(
        (message) => message.content === "Pyetja e parë e testit"
      )
    ).toBe(true);

    expect(
      finalHistory.some(
        (message) => message.content === "Pyetja e dytë e testit"
      )
    ).toBe(true);

    expect(
      finalHistory.some(
        (message) => message.content === "Shërbimi funksionon përsëri."
      )
    ).toBe(true);
  });
});
