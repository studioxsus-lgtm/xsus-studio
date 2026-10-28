
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateResponseQuality: vi.fn(),
  verifyResponseSources: vi.fn(),
  createResponseQualityReport: vi.fn(),
}));

vi.mock(
  "../../src/core/response-quality-engine.js",
  () => ({
    evaluateResponseQuality:
      mocks.evaluateResponseQuality,
  })
);

vi.mock(
  "../../src/core/response-source-verifier.js",
  () => ({
    verifyResponseSources:
      mocks.verifyResponseSources,
  })
);

vi.mock(
  "../../src/core/response-quality-report.js",
  () => ({
    createResponseQualityReport:
      mocks.createResponseQualityReport,
  })
);

import {
  createResponseQualityPipeline,
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS Response Quality Pipeline — Contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.evaluateResponseQuality.mockReturnValue({
      valid: true,
      score: 90,
      dimensions: {
        completeness: 90,
        clarity: 90,
        language: 90,
        sources: 90,
      },
      errors: [],
      sourceCount: 0,
    });

    mocks.verifyResponseSources.mockReturnValue({
      version: "1.0.0",
      results: [],
      total: 0,
      validCount: 0,
      invalidCount: 0,
      verifiedCount: 0,
      trustEstablishedCount: 0,
    });

    mocks.createResponseQualityReport.mockReturnValue({
      version: "1.0.0",
      status: "complete",
    });
  });

  it("ruan kontratën publike të pipeline-it", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Çfarë është XSUS AI?",
      answer: "XSUS AI është një sistem AI.",
      requestedLanguage: "sq",
      responseLanguage: "sq",
      sources: [],
    });

    expect(result).toEqual({
      version: "1.0.0",
      quality: expect.any(Object),
      sourceVerification: expect.any(Object),
      report: expect.any(Object),
      errors: [],
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  it.each([
    null,
    [],
    "hyrje e pavlefshme",
    42,
  ])(
    "refuzon hyrjen e pavlefshme: %j",
    (input) => {
      const pipeline = createResponseQualityPipeline();

      const result = pipeline.evaluate(input);

      expect(result.version).toBe("1.0.0");
      expect(result.quality).toBeNull();
      expect(result.sourceVerification).toBeNull();
      expect(result.report).toBeNull();

      expect(result.errors).toEqual([
        {
          code: "INVALID_INPUT",
          message: "Hyrja duhet të jetë objekt.",
        },
      ]);

      expect(
        mocks.evaluateResponseQuality
      ).not.toHaveBeenCalled();

      expect(
        mocks.verifyResponseSources
      ).not.toHaveBeenCalled();

      expect(
        mocks.createResponseQualityReport
      ).not.toHaveBeenCalled();
    }
  );

  it("regjistron përgjigjen bosh pa ndalur pipeline-in", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Test",
      answer: "   ",
      requestedLanguage: "sq",
      sources: [],
    });

    expect(
      result.errors.some(
        (error) => error.code === "EMPTY_ANSWER"
      )
    ).toBe(true);

    expect(
      mocks.evaluateResponseQuality
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.verifyResponseSources
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.createResponseQualityReport
    ).toHaveBeenCalledTimes(1);
  });

  it("krijon raport me të dhëna të pamjaftueshme kur cilësia kthehet null", () => {
    mocks.evaluateResponseQuality.mockReturnValue(null);

    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Test",
      answer: "Përgjigje testuese.",
      requestedLanguage: "sq",
      sources: [],
    });

    expect(result.quality).toBeNull();
    expect(result.sourceVerification).not.toBeNull();
    expect(result.report).not.toBeNull();

    expect(
      mocks.createResponseQualityReport
    ).toHaveBeenCalledTimes(1);

    const [reportQuality, reportSources] =
      mocks.createResponseQualityReport.mock.calls[0];

    expect(reportQuality).toMatchObject({
      valid: false,
      score: null,
      dimensions: {},
      errors: ["QUALITY_EVALUATION_FAILED"],
      sourceCount: 0,
    });

    expect(reportSources).toEqual(
      result.sourceVerification
    );

    expect(
      result.errors.some(
        (error) =>
          error.code === "QUALITY_EVALUATION_FAILED"
      )
    ).toBe(false);
  });

  it("normalizon fushat e gjuhës dhe burimet", () => {
    const pipeline = createResponseQualityPipeline();

    pipeline.evaluate({
      query: "  Test  ",
      answer: "  Përgjigje  ",
      expectedLanguage: " sq ",
      responseLanguage: " sq ",
      sources: "burim i pavlefshëm",
    });

    expect(
      mocks.evaluateResponseQuality
    ).toHaveBeenCalledWith({
      query: "Test",
      answer: "Përgjigje",
      requestedLanguage: "sq",
      responseLanguage: "sq",
      sources: [],
    });

    expect(
      mocks.verifyResponseSources
    ).toHaveBeenCalledWith([]);
  });

  it("nuk ekspozon gabime të brendshme në përgjigje", () => {
    mocks.evaluateResponseQuality.mockImplementation(
      () => {
        throw new Error(
          "PRIVATE_INTERNAL_QUALITY_ERROR"
        );
      }
    );

    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Test",
      answer: "Përgjigje testuese.",
      requestedLanguage: "sq",
      sources: [],
    });

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(
      "PRIVATE_INTERNAL_QUALITY_ERROR"
    );

    expect(serialized).toContain(
      "QUALITY_EVALUATION_FAILED"
    );

    expect(result.sourceVerification).not.toBeNull();
    expect(result.report).not.toBeNull();
  });
});
