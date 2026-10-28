
import { describe, expect, test, vi } from "vitest";

const pipelineEvaluate = vi.hoisted(() => vi.fn());

vi.mock("../../src/core/response-quality-pipeline.js", () => ({
  createResponseQualityPipeline: () => ({
    evaluate: pipelineEvaluate
  })
}));

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Quality Metadata Integrity", () => {
  test("ruan strukturën e metadata-s së cilësisë", async () => {
    pipelineEvaluate.mockReturnValue({
      quality: {
        version: "1.0.0",
        valid: true,
        score: 92,
        dimensions: {
          completeness: 95,
          clarity: 90,
          language: 100,
          sources: 83
        },
        sourceCount: 2,
        errors: []
      },
      report: {
        status: "valid"
      },
      sourceVerification: {
        verifiedCount: 0
      }
    });

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.version).toBe("1.2.0");
    expect(result.metadata.version).toBe("1.2.0");

    expect(result.metadata.responseQuality).toEqual({
      version: "1.0.0",
      valid: true,
      score: 92,
      dimensions: {
        completeness: 95,
        clarity: 90,
        language: 100,
        sources: 83
      },
      sourceCount: 2,
      errors: []
    });

    expect(result.metadata).not.toHaveProperty("report");
    expect(result.metadata).not.toHaveProperty("sourceVerification");
  });

  test("nuk ekspozon fusha të brendshme të pipeline-it", async () => {
    pipelineEvaluate.mockReturnValue({
      quality: {
        version: "1.0.0",
        valid: false,
        score: 40,
        dimensions: {},
        sourceCount: 0,
        errors: ["INSUFFICIENT_DATA"]
      },
      report: {
        internalDebug: "private"
      },
      sourceVerification: {
        internalDetails: "private"
      }
    });

    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();

    expect(result.metadata.responseQuality).not.toHaveProperty(
      "internalDebug"
    );

    expect(result.metadata).not.toHaveProperty("report");
    expect(result.metadata).not.toHaveProperty("sourceVerification");
  });
});
