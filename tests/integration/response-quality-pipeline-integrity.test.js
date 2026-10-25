import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline Integrity", () => {
  test("ruan versionin e pipeline", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
  });

  test("kthen strukturën e plotë të rezultatit", () => {
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

    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("raporti përdor rezultatin origjinal të cilësisë", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Uji përbëhet nga hidrogjeni dhe oksigjeni.",
      expectedLanguage: "sq",
      sources: []
    });

    if (result.quality && result.report) {
      expect(result.report.score).toBe(result.quality.score);
      expect(result.report.valid).toBe(result.quality.valid);
      expect(result.report.dimensions).toEqual(
        result.quality.dimensions
      );
    } else {
      throw new Error(
        "Vlerësimi i cilësisë ose raporti nuk u krijua."
      );
    }
  });

  test("nuk i konsideron automatikisht burimet të besueshme", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo është një përgjigje prove.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove pa verifikim të pavarur."
        }
      ]
    });

    expect(result.sourceVerification).not.toBeNull();

    if (Array.isArray(result.sourceVerification.results)) {
      for (const source of result.sourceVerification.results) {
        expect(source.verified).not.toBe(true);
        expect(source.trustEstablished).not.toBe(true);
      }
    }
  });

  test("raporton hyrjen bosh pa e fshehur gabimin", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "   ",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.errors.length).toBeGreaterThan(0);

    expect(
      result.errors.some(
        (error) => error.code === "EMPTY_ANSWER"
      )
    ).toBe(true);
  });

  test("trajton objektet e pavlefshme të hyrjes", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(null);

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("nuk ndryshon listën origjinale të burimeve", () => {
    const pipeline = createResponseQualityPipeline();

    const sources = [
      {
        title: "Burim prove",
        content: "Përmbajtje prove."
      }
    ];

    const originalSources = structuredClone(sources);

    pipeline.evaluate({
      answer: "Përgjigje prove.",
      expectedLanguage: "sq",
      sources
    });

    expect(sources).toEqual(originalSources);
  });

  test("kthen një listë gabimesh edhe kur vlerësimi dështon", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "",
      expectedLanguage: "sq",
      sources: []
    });

    expect(Array.isArray(result.errors)).toBe(true);

    for (const error of result.errors) {
      expect(error).toHaveProperty("code");
      expect(error).toHaveProperty("message");
    }
  });
});
