
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluateResponseQuality: vi.fn(),
  verifyResponseSources: vi.fn(),
  createResponseQualityReport: vi.fn(),
}));

vi.mock("../../src/core/response-quality-engine.js", () => ({
  evaluateResponseQuality: mocks.evaluateResponseQuality,
}));

vi.mock("../../src/core/response-source-verifier.js", () => ({
  verifyResponseSources: mocks.verifyResponseSources,
}));

vi.mock("../../src/core/response-quality-report.js", () => ({
  createResponseQualityReport: mocks.createResponseQualityReport,
}));

import {
  createResponseQualityPipeline,
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS Response Quality Pipeline — Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.evaluateResponseQuality.mockReturnValue({
      score: 90,
      dimensions: {},
      issues: [],
    });

    mocks.verifyResponseSources.mockReturnValue({
      version: "1.0.0",
      total: 1,
      validCount: 0,
      structurallyValidCount: 0,
      invalidCount: 0,
      unverifiedCount: 1,
      verifiedCount: 0,
      trustEstablishedCount: 0,
      results: [],
    });

    mocks.createResponseQualityReport.mockReturnValue({
      version: "1.0.0",
      status: "completed",
    });
  });

  it("ruan rezultatin kur verifikimi i burimeve dështon", () => {
    mocks.verifyResponseSources.mockImplementation(() => {
      throw new Error("Simulated source verification failure");
    });

    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Çfarë është XSUS AI?",
      answer: "XSUS AI është një sistem inteligjence artificiale.",
      language: "sq",
      sources: [
        {
          title: "XSUS",
          content: "Përshkrim i burimit.",
          url: "https://example.com",
        },
      ],
    });

    expect(result.version).toBe("1.0.0");
    expect(result.quality).not.toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.errors).toContain(
      "SOURCE_VERIFICATION_FAILED",
    );
    expect(result.report).not.toBeNull();

    expect(mocks.evaluateResponseQuality).toHaveBeenCalledTimes(1);
    expect(mocks.verifyResponseSources).toHaveBeenCalledTimes(1);
    expect(mocks.createResponseQualityReport).toHaveBeenCalledTimes(1);
  });

  it("ruan verifikimin kur vlerësimi i cilësisë dështon", () => {
    mocks.evaluateResponseQuality.mockImplementation(() => {
      throw new Error("Simulated quality evaluation failure");
    });

    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Test",
      answer: "Përgjigje testuese.",
      language: "sq",
      sources: [
        {
          title: "Dokument",
          content: "Përmbajtje testuese.",
          url: "https://example.com",
        },
      ],
    });

    expect(result.quality).toBeNull();
    expect(result.sourceVerification).not.toBeNull();
    expect(result.errors).toContain(
      "QUALITY_EVALUATION_FAILED",
    );
    expect(result.report).not.toBeNull();
  });

  it("regjistron gabimin e raportit pa ekspozuar mesazhin e brendshëm", () => {
    mocks.createResponseQualityReport.mockImplementation(() => {
      throw new Error("Internal report failure");
    });

    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Test",
      answer: "Përgjigje testuese.",
      language: "sq",
      sources: [],
    });

    expect(result.errors).toContain(
      "REPORT_CREATION_FAILED",
    );

    expect(JSON.stringify(result)).not.toContain(
      "Internal report failure",
    );
  });
});
