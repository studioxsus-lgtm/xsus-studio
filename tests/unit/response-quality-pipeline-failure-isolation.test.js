import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateResponseQuality: vi.fn(),
  verifyResponseSources: vi.fn(),
  createResponseQualityReport: vi.fn()
}));

vi.mock("../../src/core/response-quality-engine.js", () => ({
  evaluateResponseQuality: mocks.evaluateResponseQuality
}));

vi.mock("../../src/core/response-source-verifier.js", () => ({
  verifyResponseSources: mocks.verifyResponseSources
}));

vi.mock("../../src/core/response-quality-report.js", () => ({
  createResponseQualityReport: mocks.createResponseQualityReport
}));

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Pipeline Failure Isolation", () => {
  const validQuality = {
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
  };

  const validVerification = {
    total: 0,
    validCount: 0,
    structurallyValidCount: 0,
    invalidCount: 0,
    unverifiedCount: 0,
    verifiedCount: 0,
    trustEstablishedCount: 0,
    results: []
  };

  const validReport = {
    valid: true,
    score: 90,
    dimensions: validQuality.dimensions,
    recommendations: [],
    warnings: []
  };

  function configureSuccessfulComponents() {
    mocks.evaluateResponseQuality.mockReturnValue(validQuality);
    mocks.verifyResponseSources.mockReturnValue(validVerification);
    mocks.createResponseQualityReport.mockReturnValue(validReport);
  }

  function createInput() {
    return {
      query: "Pyetje prove",
      answer: "Përgjigje prove.",
      expectedLanguage: "sq",
      sources: []
    };
  }

  function expectStandardError(result, code) {
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code })
    );
  }

  test("ruan versionin publik 1.0.0", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
  });

  test("izolon dështimin e vlerësimit të cilësisë", () => {
    configureSuccessfulComponents();

    mocks.evaluateResponseQuality.mockImplementation(() => {
      throw new Error("Gabim i brendshëm i cilësisë");
    });

    const result = createResponseQualityPipeline().evaluate(createInput());

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expectStandardError(result, "QUALITY_EVALUATION_FAILED");

    expect(result.sourceVerification).toBe(validVerification);
    expect(result.report).toBe(validReport);

    expect(mocks.verifyResponseSources).toHaveBeenCalledTimes(1);
    expect(mocks.createResponseQualityReport).toHaveBeenCalledTimes(1);

    expect(mocks.createResponseQualityReport).toHaveBeenCalledWith(
      expect.objectContaining({
        valid: false,
        score: null,
        errors: ["QUALITY_EVALUATION_FAILED"]
      }),
      validVerification
    );
  });

  test("izolon dështimin e verifikimit të burimeve", () => {
    configureSuccessfulComponents();

    mocks.verifyResponseSources.mockImplementation(() => {
      throw new Error("Gabim i brendshëm i verifikimit");
    });

    const result = createResponseQualityPipeline().evaluate(createInput());

    expect(result.quality).toBe(validQuality);
    expect(result.sourceVerification).toBeNull();
    expectStandardError(result, "SOURCE_VERIFICATION_FAILED");

    expect(result.report).toBe(validReport);
    expect(mocks.createResponseQualityReport).toHaveBeenCalledTimes(1);

    expect(mocks.createResponseQualityReport).toHaveBeenCalledWith(
      validQuality,
      null
    );
  });

  test("izolon dështimin e krijimit të raportit", () => {
    configureSuccessfulComponents();

    mocks.createResponseQualityReport.mockImplementation(() => {
      throw new Error("Gabim i brendshëm i raportit");
    });

    const result = createResponseQualityPipeline().evaluate(createInput());

    expect(result.quality).toBe(validQuality);
    expect(result.sourceVerification).toBe(validVerification);
    expect(result.report).toBeNull();

    expectStandardError(result, "REPORT_CREATION_FAILED");
  });

  test("regjistron veçmas dështimet e të tre komponentëve", () => {
    configureSuccessfulComponents();

    mocks.evaluateResponseQuality.mockImplementation(() => {
      throw new Error("Gabim cilësie");
    });

    mocks.verifyResponseSources.mockImplementation(() => {
      throw new Error("Gabim burimesh");
    });

    mocks.createResponseQualityReport.mockImplementation(() => {
      throw new Error("Gabim raporti");
    });

    const result = createResponseQualityPipeline().evaluate(createInput());

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();

    expect(result.errors.map((error) => error.code)).toEqual([
      "QUALITY_EVALUATION_FAILED",
      "SOURCE_VERIFICATION_FAILED",
      "REPORT_CREATION_FAILED"
    ]);
  });

  test("ruan gabimin EMPTY_ANSWER kur dështon edhe një komponent", () => {
    configureSuccessfulComponents();

    mocks.evaluateResponseQuality.mockImplementation(() => {
      throw new Error("Gabim cilësie");
    });

    const result = createResponseQualityPipeline().evaluate({
      ...createInput(),
      answer: "   "
    });

    expectStandardError(result, "EMPTY_ANSWER");
    expectStandardError(result, "QUALITY_EVALUATION_FAILED");
  });

  test("nuk i zbulon mesazhet e përjashtimeve të brendshme", () => {
    configureSuccessfulComponents();

    mocks.verifyResponseSources.mockImplementation(() => {
      throw new Error("INTERNAL_SECRET_DETAILS");
    });

    const result = createResponseQualityPipeline().evaluate(createInput());

    expectStandardError(result, "SOURCE_VERIFICATION_FAILED");

    expect(
      JSON.stringify(result.errors)
    ).not.toContain("INTERNAL_SECRET_DETAILS");
  });

  test("kthen rezultate dhe lista gabimesh të ngrira", () => {
    configureSuccessfulComponents();

    const result = createResponseQualityPipeline().evaluate(createInput());

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });
});
