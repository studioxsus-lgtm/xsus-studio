
import { describe, expect, it } from "vitest";

import {
  RESPONSE_QUALITY_BENCHMARK_REGRESSION_DETECTOR_VERSION,
  detectResponseQualityBenchmarkRegressions,
} from "../../src/core/response-quality-benchmark-regression-detector.js";

function createReport(results) {
  return {
    version: "1.0.0",
    results,
  };
}

function result(id, status, actual, direction = "min") {
  return {
    id,
    status,
    actual,
    direction,
  };
}

describe("XSUS Response Quality Benchmark Regression Detector", () => {
  it("përdor versionin e pritshëm", () => {
    expect(
      RESPONSE_QUALITY_BENCHMARK_REGRESSION_DETECTOR_VERSION
    ).toBe("1.0.0");
  });

  it("zbulon regresionin nga passed në failed", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("accuracy", "passed", 0.99)]),
      createReport([result("accuracy", "failed", 0.80)])
    );

    expect(report.summary.regressionCount).toBe(1);
    expect(report.results[0].change).toBe("regression");
    expect(report.results[0].regression).toBe(true);
  });

  it("zbulon përmirësimin nga failed në passed", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("accuracy", "failed", 0.80)]),
      createReport([result("accuracy", "passed", 0.99)])
    );

    expect(report.summary.improvementCount).toBe(1);
    expect(report.results[0].change).toBe("improvement");
  });

  it("identifikon rezultatet e pandryshuara", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("accuracy", "passed", 0.99)]),
      createReport([result("accuracy", "passed", 0.99)])
    );

    expect(report.summary.unchangedCount).toBe(1);
    expect(report.results[0].change).toBe("unchanged");
  });

  it("identifikon metrikat e reja dhe të hequra", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("oldMetric", "passed", 1)]),
      createReport([result("newMetric", "passed", 1)])
    );

    expect(report.summary.addedCount).toBe(1);
    expect(report.summary.removedCount).toBe(1);
  });

  it("trajton metrikën që mungon si regresion", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("accuracy", "passed", 0.99)]),
      createReport([result("accuracy", "missing", null)])
    );

    expect(report.summary.regressionCount).toBe(1);
    expect(report.results[0].change).toBe("missing");
  });

  it("refuzon raportin që nuk është objekt i thjeshtë", () => {
    expect(() =>
      detectResponseQualityBenchmarkRegressions(null, createReport([]))
    ).toThrow("previousReport duhet të jetë objekt i thjeshtë.");
  });

  it("refuzon results që nuk është array", () => {
    expect(() =>
      detectResponseQualityBenchmarkRegressions(
        { results: {} },
        createReport([])
      )
    ).toThrow("previousReport.results duhet të jetë një array.");
  });

  it("refuzon ID të përsëritura", () => {
    expect(() =>
      detectResponseQualityBenchmarkRegressions(
        createReport([
          result("accuracy", "passed", 0.99),
          result("accuracy", "passed", 0.98),
        ]),
        createReport([])
      )
    ).toThrow("previousReport.results përmban ID të përsëritur: accuracy.");
  });

  it("kthen raport të pandryshueshëm", () => {
    const report = detectResponseQualityBenchmarkRegressions(
      createReport([result("accuracy", "passed", 0.99)]),
      createReport([result("accuracy", "failed", 0.80)])
    );

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.summary)).toBe(true);
    expect(Object.isFrozen(report.results)).toBe(true);
    expect(Object.isFrozen(report.results[0])).toBe(true);
  });
});
