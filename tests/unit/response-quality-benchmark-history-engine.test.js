
import { describe, expect, it } from "vitest";

import {
  RESPONSE_QUALITY_BENCHMARK_HISTORY_ENGINE_VERSION,
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

function createReport(value = 1) {
  return {
    version: "1.0.0",
    summary: {
      benchmarkCount: 1,
      passedCount: value,
    },
    results: [
      {
        id: "accuracy",
        status: "passed",
        actual: value,
      },
    ],
  };
}

function createEntry(id, timestamp, value = 1) {
  return {
    id,
    timestamp,
    report: createReport(value),
  };
}

describe("XSUS Response Quality Benchmark History Engine", () => {
  it("përdor versionin e pritshëm", () => {
    expect(
      RESPONSE_QUALITY_BENCHMARK_HISTORY_ENGINE_VERSION
    ).toBe("1.0.0");
  });

  it("krijon historik bosh", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    expect(engine.getHistorySize()).toBe(0);
    expect(engine.listReports()).toEqual([]);
    expect(engine.getLatestReport()).toBeNull();
  });

  it("ruan dhe rikthen një raport", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));

    expect(engine.getHistorySize()).toBe(1);
    expect(engine.getReportById("run-1").id).toBe(
      "run-1"
    );
  });

  it("liston raportet nga më i riu te më i vjetri", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));
    engine.addReport(createEntry("run-2", 300));
    engine.addReport(createEntry("run-3", 200));

    expect(
      engine.listReports().map((entry) => entry.id)
    ).toEqual(["run-2", "run-3", "run-1"]);
  });

  it("ruan rendin e futjes kur timestamp është i njëjtë", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));
    engine.addReport(createEntry("run-2", 100));

    expect(
      engine.listReports().map((entry) => entry.id)
    ).toEqual(["run-2", "run-1"]);
  });

  it("kufizon numrin e raporteve", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine({
        maxEntries: 2,
      });

    engine.addReport(createEntry("run-1", 100));
    engine.addReport(createEntry("run-2", 200));
    engine.addReport(createEntry("run-3", 300));

    expect(engine.getHistorySize()).toBe(2);
    expect(
      engine.listReports().map((entry) => entry.id)
    ).toEqual(["run-3", "run-2"]);

    expect(engine.getReportById("run-1")).toBeNull();
  });

  it("refuzon ID të përsëritura", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));

    expect(() =>
      engine.addReport(createEntry("run-1", 200))
    ).toThrow(
      "Raporti ekziston tashmë në historik: run-1."
    );
  });

  it("kthen null kur raporti nuk gjendet", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    expect(
      engine.getReportById("missing")
    ).toBeNull();
  });

  it("fshin vetëm raportin e kërkuar", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));
    engine.addReport(createEntry("run-2", 200));

    expect(engine.removeReport("run-1")).toBe(true);
    expect(engine.removeReport("run-1")).toBe(false);
    expect(engine.getHistorySize()).toBe(1);
    expect(engine.getReportById("run-2")).not.toBeNull();
  });

  it("pastron historikun dhe kthen numrin e fshirë", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createEntry("run-1", 100));
    engine.addReport(createEntry("run-2", 200));

    expect(engine.clearHistory()).toBe(2);
    expect(engine.clearHistory()).toBe(0);
    expect(engine.getHistorySize()).toBe(0);
  });

  it("refuzon hyrjen që nuk është objekt i thjeshtë", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    expect(() => engine.addReport(null)).toThrow(
      "entry duhet të jetë objekt i thjeshtë."
    );
  });

  it("refuzon raportin pa results array", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    expect(() =>
      engine.addReport({
        id: "run-1",
        timestamp: 100,
        report: {
          summary: {},
          results: {},
        },
      })
    ).toThrow(
      "report.results duhet të jetë një array."
    );
  });

  it("refuzon timestamp të pavlefshëm", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    expect(() =>
      engine.addReport(createEntry("run-1", -1))
    ).toThrow(
      "timestamp duhet të jetë numër i vlefshëm jo negativ."
    );
  });

  it("i mbron snapshot-et nga ndryshimet e jashtme", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    const entry = createEntry("run-1", 100, 1);

    engine.addReport(entry);

    entry.report.results[0].actual = 999;

    const saved = engine.getReportById("run-1");

    expect(saved.report.results[0].actual).toBe(1);
    expect(Object.isFrozen(saved)).toBe(true);
    expect(Object.isFrozen(saved.report)).toBe(true);
    expect(Object.isFrozen(saved.report.results)).toBe(true);
  });

  it("kthen metadata të sakta", () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine({
        maxEntries: 10,
      });

    engine.addReport(createEntry("run-1", 100));

    expect(engine.getMetadata()).toEqual({
      version: "1.0.0",
      maxEntries: 10,
      entryCount: 1,
    });
  });
});
