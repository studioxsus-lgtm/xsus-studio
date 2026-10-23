
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

describe("XSUS AI Core — Parallel conversations", () => {
  afterEach(() => {
    vi.resetAllMocks();
    clearAllMemory();
  });

  test("izolon historikun e dy bisedave paralele", async () => {
    searchKnowledge.mockImplementation(async (query) => ({
      success: true,
      query,
      results: [
        {
          title: "Përgjigje testuese",
          content: `Përgjigjja për: ${query}`,
          source: "test"
        }
      ],
      sources: ["test"],
      errors: [],
      metadata: {}
    }));

    const [resultA, resultB] = await Promise.all([
      processAIRequest({
        query: "Tema private A",
        language: "sq",
        conversationId: "parallel-conversation-A"
      }),
      processAIRequest({
        query: "Tema private B",
        language: "sq",
        conversationId: "parallel-conversation-B"
      })
    ]);

    expect(resultA.answer).toContain("Tema private A");
    expect(resultB.answer).toContain("Tema private B");

    const historyA = getMemoryHistory("parallel-conversation-A");
    const historyB = getMemoryHistory("parallel-conversation-B");

    expect(
      historyA.some((message) => message.content === "Tema private A")
    ).toBe(true);

    expect(
      historyA.some((message) => message.content === "Tema private B")
    ).toBe(false);

    expect(
      historyB.some((message) => message.content === "Tema private B")
    ).toBe(true);

    expect(
      historyB.some((message) => message.content === "Tema private A")
    ).toBe(false);
  });
});
