
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { searchKnowledge } from "../../src/knowledge/knowledge-service.js";
import { processAIRequest } from "../../src/core/ai-core.js";

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
  searchKnowledge: vi.fn(),
}));

describe("XSUS AI Core Integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("përpunon kërkesën dhe kthen përgjigjen nga njohuritë", async () => {
    searchKnowledge.mockResolvedValue({
      success: true,
      results: [
        {
          title: "XSUS",
          content: "XSUS Studio është platformë teknologjike.",
          source: "test-knowledge",
        },
      ],
      sources: ["test-knowledge"],
    });

    const result = await processAIRequest({
      query: "Çfarë është XSUS Studio?",
      language: "sq",
    });

    expect(result.answer).toContain(
      "XSUS Studio është platformë teknologjike."
    );
    expect(result.language).toBe("sq");
    expect(result.requestId).toBeTruthy();
    expect(result.source).toBe("xsus-knowledge-service");
    expect(searchKnowledge).toHaveBeenCalledOnce();
  });

  test("kthen përgjigje rezervë kur nuk ka rezultate", async () => {
    searchKnowledge.mockResolvedValue({
      success: true,
      results: [],
      sources: [],
    });

    const result = await processAIRequest({
      query: "Një pyetje pa rezultate",
      language: "sq",
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.requestId).toBeTruthy();
  });

  test("trajton dështimin e bazës së njohurive", async () => {
    searchKnowledge.mockResolvedValue({
      success: false,
      error: "Gabim prove në njohuri",
      results: [],
      sources: [],
    });

    const result = await processAIRequest({
      query: "Pyetje prove",
      language: "sq",
    });

    expect(result.error).toBe("Gabim prove në njohuri");
    expect(result.requestId).toBeTruthy();
  });

  test("refuzon pyetjen bosh", async () => {
    const result = await processAIRequest({
      query: "   ",
      language: "sq",
    });

    expect(result.error).toBeTruthy();
    expect(searchKnowledge).not.toHaveBeenCalled();
  });

  test("trajton gabimet e papritura të kërkimit", async () => {
    searchKnowledge.mockRejectedValue(
      new Error("Gabim i papritur")
    );

    const result = await processAIRequest({
      query: "Pyetje prove",
      language: "sq",
    });

    expect(result.error).toBe("Gabim i papritur");
    expect(result.requestId).toBeTruthy();
  });
});
