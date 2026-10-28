
import { afterEach, describe, expect, test, vi } from "vitest";

const pipelineEvaluate = vi.hoisted(() => vi.fn());

vi.mock("../../src/core/response-quality-pipeline.js", () => ({
  createResponseQualityPipeline: () => ({
    evaluate: pipelineEvaluate
  })
}));

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Quality Input Contract", () => {
  afterEach(() => {
    pipelineEvaluate.mockReset();
  });

  test("i dërgon pipeline-it input-in me strukturën e pritshme", async () => {
    pipelineEvaluate.mockReturnValue({
      quality: {
        version: "1.0.0",
        valid: true,
        score: 90,
        dimensions: {},
        sourceCount: 0,
        errors: []
      }
    });

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(pipelineEvaluate).toHaveBeenCalled();

    const input = pipelineEvaluate.mock.calls[0][0];

    expect(input).toHaveProperty(
      "query",
      "Çfarë është programimi?"
    );
    expect(input).toHaveProperty("answer", result.answer);
    expect(input).toHaveProperty("expectedLanguage", "sq");
    expect(input).toHaveProperty("responseLanguage", "sq");
    expect(input).toHaveProperty("sources");
    expect(Array.isArray(input.sources)).toBe(true);
  });

  test("përdor gjuhën e kërkesës për të dy fushat e gjuhës", async () => {
    pipelineEvaluate.mockReturnValue({
      quality: {
        version: "1.0.0",
        valid: true,
        score: 90,
        dimensions: {},
        sourceCount: 0,
        errors: []
      }
    });

    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(pipelineEvaluate).toHaveBeenCalled();

    const input = pipelineEvaluate.mock.calls[0][0];

    expect(input.expectedLanguage).toBe("en");
    expect(input.responseLanguage).toBe("en");
  });
});
