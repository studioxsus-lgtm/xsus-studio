import { describe, expect, test } from "vitest";

import {
  evaluateResponseQualityPipeline,
  createResponseQualityPipelineAPI,
  getResponseQualityPipelineInfo,
  RESPONSE_QUALITY_PIPELINE_API_VERSION
} from "../../src/core/response-quality-pipeline-api.js";

describe("XSUS AI Core — Response Quality Pipeline API", () => {
  test("ekspozon versionin e API-së", () => {
    expect(RESPONSE_QUALITY_PIPELINE_API_VERSION).toBe("1.0.0");

    expect(getResponseQualityPipelineInfo()).toEqual({
      apiVersion: "1.0.0",
      pipelineVersion: "1.0.0"
    });
  });

  test("kthen rezultat të strukturuar", () => {
    const result = evaluateResponseQualityPipeline({
      answer: "Parisi është kryeqyteti i Francës.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result).toHaveProperty("version", "1.0.0");
    expect(result).toHaveProperty("quality");
    expect(result).toHaveProperty("sourceVerification");
    expect(result).toHaveProperty("report");
    expect(result).toHaveProperty("errors");
  });

  test("krijon një API me versionet dhe funksionin evaluate", () => {
    const api = createResponseQualityPipelineAPI();

    expect(api.version).toBe("1.0.0");
    expect(api.pipelineVersion).toBe("1.0.0");
    expect(typeof api.evaluate).toBe("function");
    expect(Object.isFrozen(api)).toBe(true);
  });

  test("instanca e krijuar mund të vlerësojë një përgjigje", () => {
    const api = createResponseQualityPipelineAPI();

    const result = api.evaluate({
      answer: "Përgjigje prove për XSUS AI.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result).toHaveProperty("quality");
    expect(result).toHaveProperty("report");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("trajton hyrjen e pavlefshme nëpërmjet API-së publike", () => {
    const result = evaluateResponseQualityPipeline(null);

    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("informacioni i versioneve nuk mund të ndryshohet", () => {
    const info = getResponseQualityPipelineInfo();

    expect(Object.isFrozen(info)).toBe(true);
    expect(() => {
      info.apiVersion = "9.9.9";
    }).toThrow();
  });
});
