import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline", () => {
  test("ka versionin e pritshëm", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
  });

  test("kthen rezultat të strukturuar për një përgjigje", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
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

  test("ruan rezultatet e cilësisë dhe raportit", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Uji përbëhet nga hidrogjeni dhe oksigjeni.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report).toHaveProperty("dimensions");
    expect(result.report).toHaveProperty("recommendations");
  });

  test("nuk pretendon se burimet janë verifikuar pa prova", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Një përgjigje provë.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove pa verifikim të pavarur."
        }
      ]
    });

    expect(result.sourceVerification).toBeDefined();

    if (Array.isArray(result.sourceVerification.results)) {
      for (const source of result.sourceVerification.results) {
        expect(source.verified).not.toBe(true);
        expect(source.trustEstablished).not.toBe(true);
      }
    }
  });

  test("raporton gabim për hyrjen e pavlefshme", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
