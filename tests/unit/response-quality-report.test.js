import { describe, expect, test } from "vitest";

import {
  createResponseQualityReport,
  RESPONSE_QUALITY_REPORT_VERSION,
  RESPONSE_QUALITY_REPORT_STATUSES
} from "../../src/core/response-quality-report.js";

describe("XSUS AI Core — Response Quality Report", () => {
  const qualityResult = {
    version: "1.0.0",
    valid: true,
    score: 95,
    dimensions: {
      completeness: 100,
      clarity: 100,
      language: 100,
      sources: 80
    },
    sourceCount: 1,
    languageVerification: null,
    errors: []
  };

  test("ka versionin dhe strukturën e pritshme", () => {
    const report = createResponseQualityReport(
      qualityResult
    );

    expect(RESPONSE_QUALITY_REPORT_VERSION).toBe("1.0.0");
    expect(report.version).toBe("1.0.0");

    expect(report).toHaveProperty("status");
    expect(report).toHaveProperty("valid");
    expect(report).toHaveProperty("score");
    expect(report).toHaveProperty("dimensions");
    expect(report).toHaveProperty("sources");
    expect(report).toHaveProperty("errors");
    expect(report).toHaveProperty("warnings");
    expect(report).toHaveProperty("recommendations");
  });

  test("raporton pikët e dimensioneve", () => {
    const report = createResponseQualityReport(
      qualityResult
    );

    expect(report.dimensions).toEqual({
      completeness: 100,
      clarity: 100,
      language: 100,
      sources: 80
    });

    expect(report.score).toBe(95);
  });

  test("identifikon të dhënat e pamjaftueshme", () => {
    const report = createResponseQualityReport({
      valid: false,
      score: null,
      dimensions: {},
      sourceCount: 0,
      errors: ["EMPTY_ANSWER"]
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.INSUFFICIENT_DATA
    );

    expect(report.errors).toContain("EMPTY_ANSWER");
  });

  test("raporton burimet pa i konsideruar të verifikuara", () => {
    const report = createResponseQualityReport(
      qualityResult,
      {
        results: [
          {
            status: "structurally_valid",
            valid: true,
            structurallyValid: true,
            verified: false,
            trustEstablished: false,
            title: "AI Research",
            contentLength: 120,
            errors: []
          }
        ],
        verifiedCount: 0,
        trustEstablishedCount: 0
      }
    );

    expect(report.sources.available).toBe(true);
    expect(report.sources.sourceCount).toBe(1);
    expect(report.sources.validCount).toBe(1);
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);

    expect(report.warnings).toContain(
      "NO_SOURCES_VERIFIED"
    );

    expect(report.warnings).toContain(
      "SOURCE_TRUST_NOT_ESTABLISHED"
    );
  });

  test("sugjeron përmirësime kur cilësia është e ulët", () => {
    const report = createResponseQualityReport({
      valid: false,
      score: 40,
      dimensions: {
        completeness: 25,
        clarity: 35,
        language: 0,
        sources: 50
      },
      sourceCount: 0,
      errors: ["EMPTY_ANSWER"]
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.NEEDS_IMPROVEMENT
    );

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.warnings).toContain(
      "QUALITY_INPUT_CONTAINS_ERRORS"
    );
  });

  test("ngrin raportin dhe koleksionet publike", () => {
    const report = createResponseQualityReport(
      qualityResult
    );

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.dimensions)).toBe(true);
    expect(Object.isFrozen(report.sources)).toBe(true);
    expect(Object.isFrozen(report.errors)).toBe(true);
    expect(Object.isFrozen(report.warnings)).toBe(true);
    expect(Object.isFrozen(report.recommendations)).toBe(true);
  });

  test("refuzon rezultatet që nuk janë objekte", () => {
    expect(() =>
      createResponseQualityReport(null)
    ).toThrow(TypeError);

    expect(() =>
      createResponseQualityReport("invalid")
    ).toThrow(TypeError);

    expect(() =>
      createResponseQualityReport([])
    ).toThrow(TypeError);
  });
});
