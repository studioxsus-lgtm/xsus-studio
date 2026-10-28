import { describe, expect, test } from "vitest";

import {
  createResponseQualityReport,
  RESPONSE_QUALITY_REPORT_STATUSES
} from "../../src/core/response-quality-report.js";

describe("XSUS AI Core — Response Quality Report Integrity", () => {
  test("refuzon rezultatet e cilësisë që nuk janë objekte të zakonshme", () => {
    expect(() => createResponseQualityReport(null)).toThrow(TypeError);
    expect(() => createResponseQualityReport([])).toThrow(TypeError);
    expect(() => createResponseQualityReport("invalid")).toThrow(TypeError);
  });

  test("normalizon rezultatet me të dhëna të pamjaftueshme", () => {
    const report = createResponseQualityReport({
      valid: false,
      score: null,
      dimensions: {},
      errors: ["QUALITY_EVALUATION_FAILED"],
      sourceCount: 0
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.INSUFFICIENT_DATA
    );
    expect(report.score).toBeNull();
    expect(report.sources.available).toBe(false);
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);
  });

  test("kufizon rezultatin numerik në intervalin 0–100", () => {
    const lowReport = createResponseQualityReport({
      valid: true,
      score: -10,
      dimensions: {
        completeness: -5,
        clarity: 50,
        language: 70,
        sources: 80
      },
      errors: [],
      sourceCount: 0
    });

    const highReport = createResponseQualityReport({
      valid: true,
      score: 120,
      dimensions: {
        completeness: 100,
        clarity: 100,
        language: 100,
        sources: 100
      },
      errors: [],
      sourceCount: 0
    });

    expect(lowReport.score).toBe(0);
    expect(lowReport.dimensions.completeness).toBe(0);
    expect(highReport.score).toBe(100);
  });

  test("nuk i konsideron burimet strukturore si faktikisht të verifikuara", () => {
    const report = createResponseQualityReport(
      {
        valid: true,
        score: 90,
        dimensions: {
          completeness: 90,
          clarity: 90,
          language: 90,
          sources: 90
        },
        errors: [],
        sourceCount: 1
      },
      {
        results: [
          {
            status: "structurally_valid",
            valid: true,
            structurallyValid: true,
            verified: false,
            trustEstablished: false,
            title: "Burim testues",
            contentLength: 100,
            errors: []
          }
        ]
      }
    );

    expect(report.sources.validCount).toBe(1);
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);
    expect(report.sources.note).toContain(
      "nuk provojnë vërtetësinë faktike"
    );
    expect(report.warnings).toContain("NO_SOURCES_VERIFIED");
    expect(report.warnings).toContain(
      "SOURCE_TRUST_NOT_ESTABLISHED"
    );
  });

  test("raporti dhe koleksionet kryesore janë të pandryshueshme", () => {
    const report = createResponseQualityReport({
      valid: true,
      score: 90,
      dimensions: {
        completeness: 90,
        clarity: 90,
        language: 90,
        sources: 90
      },
      errors: [],
      sourceCount: 0
    });

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.dimensions)).toBe(true);
    expect(Object.isFrozen(report.errors)).toBe(true);
    expect(Object.isFrozen(report.warnings)).toBe(true);
    expect(Object.isFrozen(report.recommendations)).toBe(true);
    expect(Object.isFrozen(report.sources)).toBe(true);
  });

  test("strukturat e brendshme të burimeve janë të pandryshueshme", () => {
    const report = createResponseQualityReport(
      {
        valid: true,
        score: 90,
        dimensions: {
          completeness: 90,
          clarity: 90,
          language: 90,
          sources: 90
        },
        errors: [],
        sourceCount: 1
      },
      {
        results: [
          {
            status: "structurally_valid",
            valid: true,
            structurallyValid: true,
            verified: false,
            trustEstablished: false,
            title: "Burim testues",
            contentLength: 100,
            errors: []
          }
        ]
      }
    );

    expect(Object.isFrozen(report.sources.results)).toBe(true);
    expect(Object.isFrozen(report.sources.results[0])).toBe(true);
    expect(Object.isFrozen(report.sources.results[0].errors)).toBe(true);
  });
});
