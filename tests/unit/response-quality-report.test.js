
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
    const report = createResponseQualityReport(qualityResult);

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

  test("ka tri statuset e përcaktuara", () => {
    expect(RESPONSE_QUALITY_REPORT_STATUSES).toEqual({
      COMPLETE: "complete",
      NEEDS_IMPROVEMENT: "needs_improvement",
      INSUFFICIENT_DATA: "insufficient_data"
    });

    expect(Object.isFrozen(RESPONSE_QUALITY_REPORT_STATUSES)).toBe(
      true
    );
  });

  test("raporton pikët e dimensioneve", () => {
    const report = createResponseQualityReport(qualityResult);

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

  test("identifikon raportin që ka nevojë për përmirësim", () => {
    const report = createResponseQualityReport({
      valid: true,
      score: 50,
      dimensions: {
        completeness: 50,
        clarity: 50,
        language: 50,
        sources: 50
      },
      sourceCount: 0,
      errors: []
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.NEEDS_IMPROVEMENT
    );
  });

  test("identifikon raportin e plotë kur nuk ka paralajmërime", () => {
    const report = createResponseQualityReport({
      ...qualityResult,
      score: 90,
      dimensions: {
        completeness: 90,
        clarity: 90,
        language: 90,
        sources: 90
      }
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.COMPLETE
    );
    expect(report.warnings).toEqual([]);
  });

  test("normalizon pikët jashtë intervalit 0–100", () => {
    const report = createResponseQualityReport({
      valid: true,
      score: 150,
      dimensions: {
        completeness: 150,
        clarity: -10,
        language: 75,
        sources: 50
      },
      sourceCount: 0,
      errors: []
    });

    expect(report.score).toBe(100);
    expect(report.dimensions).toEqual({
      completeness: 100,
      clarity: 0,
      language: 75,
      sources: 50
    });
  });

  test.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["tekst", "80"],
    ["undefined", undefined]
  ])(
    "trajton pikën e pavlefshme: %s",
    (_label, score) => {
      const report = createResponseQualityReport({
        valid: true,
        score,
        dimensions: {
          completeness: score,
          clarity: 80,
          language: null,
          sources: 50
        },
        sourceCount: 0,
        errors: []
      });

      expect(report.score).toBeNull();
      expect(report.dimensions.completeness).toBeNull();
      expect(report.dimensions.clarity).toBe(80);
      expect(report.dimensions.language).toBeNull();
      expect(report.dimensions.sources).toBe(50);
    }
  );

  test("normalizon dimensionet që mungojnë", () => {
    const report = createResponseQualityReport({
      valid: true,
      score: 80,
      dimensions: {
        completeness: 80
      },
      sourceCount: 0,
      errors: []
    });

    expect(report.dimensions).toEqual({
      completeness: 80,
      clarity: null,
      language: null,
      sources: null
    });
  });

  test("llogarit statusin e të dhënave të pamjaftueshme kur çdo dimension mungon", () => {
    const report = createResponseQualityReport({
      valid: true,
      score: null,
      dimensions: {
        completeness: null,
        clarity: null,
        language: null,
        sources: null
      },
      sourceCount: 0,
      errors: []
    });

    expect(report.status).toBe(
      RESPONSE_QUALITY_REPORT_STATUSES.INSUFFICIENT_DATA
    );
  });

  test("normalizon gabimet dhe heq vlerat që nuk janë tekst", () => {
    const report = createResponseQualityReport({
      ...qualityResult,
      errors: [
        " EMPTY_ANSWER ",
        "",
        null,
        42,
        " INVALID_QUERY "
      ]
    });

    expect(report.errors).toEqual([
      "EMPTY_ANSWER",
      "INVALID_QUERY"
    ]);
  });

  test("trajton listën e pavlefshme të gabimeve si listë bosh", () => {
    const report = createResponseQualityReport({
      ...qualityResult,
      errors: "EMPTY_ANSWER"
    });

    expect(report.errors).toEqual([]);
  });

  test("raporton burimet pa i konsideruar të verifikuara", () => {
    const report = createResponseQualityReport(qualityResult, {
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
    });

    expect(report.sources.available).toBe(true);
    expect(report.sources.sourceCount).toBe(1);
    expect(report.sources.validCount).toBe(1);
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);

    expect(report.warnings).toContain("NO_SOURCES_VERIFIED");
    expect(report.warnings).toContain(
      "SOURCE_TRUST_NOT_ESTABLISHED"
    );
  });

  test("normalizon rezultatet e pavlefshme të verifikimit të burimeve", () => {
    const report = createResponseQualityReport(qualityResult, {
      results: [
        null,
        "invalid",
        {
          status: " structurally_valid ",
          valid: true,
          structurallyValid: true,
          verified: false,
          trustEstablished: false,
          title: "  Example Source  ",
          contentLength: -1,
          errors: [" ERROR ", null, 10]
        }
      ]
    });

    expect(report.sources.available).toBe(true);
    expect(report.sources.verificationResultCount).toBe(3);
    expect(report.sources.sourceCount).toBe(1);
    expect(report.sources.validCount).toBe(1);
    expect(report.sources.invalidCount).toBe(2);
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);

    expect(report.sources.results[0].status).toBe("unknown");
    expect(report.sources.results[1].status).toBe("unknown");
    expect(report.sources.results[2].title).toBe("Example Source");
    expect(report.sources.results[2].contentLength).toBe(0);
    expect(report.sources.results[2].errors).toEqual(["ERROR"]);
  });

  test("shënon verifikimin si të padisponueshëm kur mungon", () => {
    const report = createResponseQualityReport(qualityResult);

    expect(report.sources.available).toBe(false);
    expect(report.sources.verificationResultCount).toBe(0);
    expect(report.sources.validCount).toBe(0);
    expect(report.sources.verifiedCount).toBe(0);
  });

  test("trajton objektin e pavlefshëm të verifikimit si të padisponueshëm", () => {
    const report = createResponseQualityReport(
      qualityResult,
      []
    );

    expect(report.sources.available).toBe(false);
    expect(report.sources.results).toEqual([]);
  });

  test("nuk ngatërron numrin e burimeve me numrin e rezultateve të verifikimit", () => {
    const report = createResponseQualityReport(
      {
        ...qualityResult,
        sourceCount: 5
      },
      {
        results: [
          {
            valid: true,
            verified: false,
            trustEstablished: false
          }
        ]
      }
    );

    expect(report.sources.sourceCount).toBe(5);
    expect(report.sources.verificationResultCount).toBe(1);
  });

  test("normalizon numrin e burimeve të pavlefshëm", () => {
    const report = createResponseQualityReport({
      ...qualityResult,
      sourceCount: -1
    });

    expect(report.sourceCount).toBe(0);
    expect(report.sources.sourceCount).toBe(0);
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
    expect(report.recommendations).toContain(
      "Korrigjo gabimet e hyrjes para se të mbështetesh te rezultati."
    );
  });

  test("sugjeron verifikim të pavarur kur burimet nuk janë verifikuar", () => {
    const report = createResponseQualityReport(qualityResult, {
      results: [
        {
          status: "structurally_valid",
          valid: true,
          structurallyValid: true,
          verified: false,
          trustEstablished: false,
          title: "Example",
          contentLength: 50,
          errors: []
        }
      ]
    });

    expect(report.recommendations).toContain(
      "Kryej verifikim të pavarur të burimeve para se t'i përdorësh si mbështetje faktike."
    );

    expect(report.recommendations).toContain(
      "Vlerëso besueshmërinë e burimeve veçmas nga validiteti i tyre strukturor."
    );
  });

  test("paralajmëron kur burimet kanë gabime strukturore", () => {
    const report = createResponseQualityReport(qualityResult, {
      results: [
        {
          status: "invalid",
          valid: false,
          structurallyValid: false,
          verified: false,
          trustEstablished: false,
          title: "",
          contentLength: 0,
          errors: ["MISSING_TITLE"]
        }
      ]
    });

    expect(report.warnings).toContain("SOME_SOURCES_INVALID");
    expect(report.recommendations).toContain(
      "Kontrollo titujt, përmbajtjen dhe URL-të e burimeve të pavlefshme."
    );
  });

  test("nuk pretendon se validiteti strukturor provon vërtetësinë", () => {
    const report = createResponseQualityReport(qualityResult, {
      results: [
        {
          status: "structurally_valid",
          valid: true,
          structurallyValid: true,
          verified: false,
          trustEstablished: false,
          title: "Example",
          contentLength: 100,
          errors: []
        }
      ]
    });

    expect(report.sources.note).toContain(
      "nuk provojnë vërtetësinë faktike"
    );
    expect(report.sources.verifiedCount).toBe(0);
    expect(report.sources.trustEstablishedCount).toBe(0);
  });

  test("ngrin raportin dhe koleksionet publike", () => {
    const report = createResponseQualityReport(qualityResult, {
      results: [
        {
          status: "structurally_valid",
          valid: true,
          structurallyValid: true,
          verified: false,
          trustEstablished: false,
          title: "Example",
          contentLength: 100,
          errors: []
        }
      ]
    });

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.dimensions)).toBe(true);
    expect(Object.isFrozen(report.sources)).toBe(true);
    expect(Object.isFrozen(report.sources.results)).toBe(true);
    expect(Object.isFrozen(report.sources.results[0])).toBe(true);
    expect(Object.isFrozen(report.sources.results[0].errors)).toBe(true);
    expect(Object.isFrozen(report.errors)).toBe(true);
    expect(Object.isFrozen(report.warnings)).toBe(true);
    expect(Object.isFrozen(report.recommendations)).toBe(true);
  });

  test("refuzon rezultatet që nuk janë objekte të thjeshta", () => {
    expect(() => createResponseQualityReport(null)).toThrow(TypeError);
    expect(() => createResponseQualityReport("invalid")).toThrow(TypeError);
    expect(() => createResponseQualityReport([])).toThrow(TypeError);
    expect(() => createResponseQualityReport(new Date())).toThrow(TypeError);
  });

  // Testet e reja — integriteti i raportit

  test("nuk ndryshon hyrjet origjinale gjatë krijimit të raportit", () => {
    const input = {
      ...qualityResult,
      dimensions: { ...qualityResult.dimensions },
      errors: [" EMPTY_ANSWER "]
    };

    const verification = {
      results: [
        {
          title: "  Burimi A  ",
          valid: true,
          verified: false,
          trustEstablished: false,
          errors: [" ERROR "]
        }
      ]
    };

    const originalInput = structuredClone(input);
    const originalVerification = structuredClone(verification);

    createResponseQualityReport(input, verification);

    expect(input).toEqual(originalInput);
    expect(verification).toEqual(originalVerification);
  });

  test("raportet e veçanta nuk ndajnë koleksionet publike", () => {
    const first = createResponseQualityReport(qualityResult);
    const second = createResponseQualityReport(qualityResult);

    expect(first).not.toBe(second);
    expect(first.dimensions).not.toBe(second.dimensions);
    expect(first.errors).not.toBe(second.errors);
    expect(first.warnings).not.toBe(second.warnings);
    expect(first.recommendations).not.toBe(second.recommendations);
    expect(first.sources).not.toBe(second.sources);
    expect(first.sources.results).not.toBe(second.sources.results);
  });

  test("ruan kontratën publike kur mungojnë fushat opsionale", () => {
    const report = createResponseQualityReport({
      valid: false
    });

    expect(Object.keys(report).sort()).toEqual([
      "dimensions",
      "errors",
      "recommendations",
      "score",
      "sourceCount",
      "sources",
      "status",
      "valid",
      "version",
      "warnings"
    ]);

    expect(report.version).toBe(RESPONSE_QUALITY_REPORT_VERSION);
    expect(report.score).toBeNull();
    expect(report.sourceCount).toBe(0);

    expect(report.dimensions).toEqual({
      completeness: null,
      clarity: null,
      language: null,
      sources: null
    });

    expect(report.sources.available).toBe(false);
    expect(report.errors).toEqual([]);

    expect(report.warnings).toEqual([
      "QUALITY_INPUT_CONTAINS_ERRORS"
    ]);

    expect(report.recommendations).toEqual([]);
  });
});
