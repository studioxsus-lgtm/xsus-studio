
import { afterEach, describe, expect, test, vi } from "vitest";

const pipelineEvaluate = vi.hoisted(() => vi.fn());

vi.mock("../../src/core/response-quality-pipeline.js", () => ({
  createResponseQualityPipeline: () => ({
    evaluate: pipelineEvaluate
  })
}));

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Quality Pipeline Resilience", () => {
  afterEach(() => {
    pipelineEvaluate.mockReset();
  });

  test("vazhdon të japë përgjigje kur pipeline dështon", async () => {
    pipelineEvaluate.mockImplementation(() => {
      throw new Error("Internal quality pipeline failure");
    });

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.version).toBe("1.2.0");

    expect(result.error).toBeUndefined();
    expect(result.answer).not.toContain(
      "Internal quality pipeline failure"
    );
  });

  test("ruan formatin publik të metadata-s kur pipeline dështon", async () => {
    pipelineEvaluate.mockImplementation(() => {
      throw new Error("Simulated pipeline failure");
    });

    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.metadata).toHaveProperty("responseQuality");

    expect(result.metadata).not.toHaveProperty("report");
    expect(result.metadata).not.toHaveProperty("sourceVerification");

    const quality = result.metadata.responseQuality;

    expect(
      quality === null || typeof quality === "object"
    ).toBe(true);

    if (quality !== null) {
      expect(quality).toHaveProperty("version");
      expect(quality).toHaveProperty("valid");
      expect(quality).toHaveProperty("score");
      expect(quality).toHaveProperty("dimensions");
      expect(quality).toHaveProperty("sourceCount");
      expect(quality).toHaveProperty("errors");
    }
  });

  test("trajton rezultatin null nga pipeline pa rrëzuar kërkesën", async () => {
    pipelineEvaluate.mockReturnValue(null);

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.version).toBe("1.2.0");
    expect(result.error).toBeUndefined();
  });
});
