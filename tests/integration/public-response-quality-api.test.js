import { describe, expect, test } from "vitest";

import {
  XSUSAI,
  createResponseQualityPipeline,
  evaluateResponseQualityPipeline,
  createResponseQualityPipelineAPI,
  getResponseQualityPipelineInfo,
  createResponseQualityReport,
  evaluateResponseQuality,
  verifyResponseSource,
  verifyResponseSources,
  RESPONSE_QUALITY_PIPELINE_VERSION,
  RESPONSE_QUALITY_PIPELINE_API_VERSION,
  RESPONSE_QUALITY_VERSION,
  RESPONSE_QUALITY_REPORT_VERSION
} from "../../src/index.js";

describe("XSUS AI Core — Public Response Quality API", () => {
  test("eksporton versionet publike", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
    expect(RESPONSE_QUALITY_PIPELINE_API_VERSION).toBe("1.0.0");
    expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
    expect(RESPONSE_QUALITY_REPORT_VERSION).toBe("1.0.0");
  });

  test("eksporton funksionet e pipeline-it", () => {
    expect(typeof createResponseQualityPipeline).toBe("function");
    expect(typeof evaluateResponseQualityPipeline).toBe("function");
    expect(typeof createResponseQualityPipelineAPI).toBe("function");
    expect(typeof getResponseQualityPipelineInfo).toBe("function");
  });

  test("eksporton funksionet e cilësisë dhe verifikimit", () => {
    expect(typeof createResponseQualityReport).toBe("function");
    expect(typeof evaluateResponseQuality).toBe("function");
    expect(typeof verifyResponseSource).toBe("function");
    expect(typeof verifyResponseSources).toBe("function");
  });

  test("objekti XSUSAI ekspozon funksionet e reja", () => {
    expect(typeof XSUSAI.createResponseQualityPipeline).toBe("function");
    expect(typeof XSUSAI.evaluateResponseQualityPipeline).toBe("function");
    expect(typeof XSUSAI.createResponseQualityPipelineAPI).toBe("function");
    expect(typeof XSUSAI.createResponseQualityReport).toBe("function");
    expect(typeof XSUSAI.verifyResponseSource).toBe("function");
    expect(typeof XSUSAI.verifyResponseSources).toBe("function");
  });

  test("pipeline-i funksionon përmes API-së publike", () => {
    const result = evaluateResponseQualityPipeline({
      answer: "Parisi është kryeqyteti i Francës.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.version).toBe("1.0.0");
    expect(result.quality).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("instanca publike mund të krijojë pipeline të ri", () => {
    const api = createResponseQualityPipelineAPI();

    expect(api.version).toBe("1.0.0");
    expect(typeof api.evaluate).toBe("function");
  });

  test("informacioni i versioneve është i disponueshëm", () => {
    const info = getResponseQualityPipelineInfo();

    expect(info).toEqual({
      apiVersion: "1.0.0",
      pipelineVersion: "1.0.0"
    });
  });
});
