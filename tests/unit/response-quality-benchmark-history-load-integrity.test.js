/**
 * XSUS AI Core — Response Quality Benchmark History
 * Faza 11.14.1 — Load & Integrity Tests
 *
 * Verifikon:
 * - Ruajtjen e një numri të madh raportesh.
 * - Unikalitetin e identifikuesve.
 * - Zbatimin e kufirit maksimal.
 * - Integritetin e të dhënave pas leximit.
 * - Mbrojtjen e të dhënave nga modifikimet e jashtme.
 * - Konsistencën e metadata-s.
 */

import { describe, expect, it } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

function createReport(index) {
  return {
    summary: {
      total: 3,
      passed: 2,
      failed: 1,
      score: index,
    },
    results: [
      {
        id: `test-${index}-1`,
        status: "passed",
        score: index,
      },
      {
        id: `test-${index}-2`,
        status: "passed",
        score: index + 1,
      },
      {
        id: `test-${index}-3`,
        status: "failed",
        score: index - 1,
      },
    ],
  };
}

function createEntry(index, timestamp = index) {
  return {
    id: `benchmark-${index}`,
    timestamp,
    report: createReport(index),
  };
}

describe(
  "XSUS AI Core — Benchmark History Load & Integrity",
  () => {
    it(
      "ruan saktë 1000 raporte pa humbje të të dhënave",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 1000,
          });

        for (let index = 1; index <= 1000; index += 1) {
          engine.addReport(createEntry(index));
        }

        expect(engine.getHistorySize()).toBe(1000);

        const reports = engine.listReports();

        expect(reports).toHaveLength(1000);

        const ids = reports.map((entry) => entry.id);

        expect(new Set(ids).size).toBe(1000);

        for (let index = 1; index <= 1000; index += 1) {
          const entry = engine.getReportById(
            `benchmark-${index}`
          );

          expect(entry).not.toBeNull();
          expect(entry.id).toBe(`benchmark-${index}`);
          expect(entry.report.summary.score).toBe(index);
          expect(entry.report.results).toHaveLength(3);
        }
      }
    );

    it(
      "refuzon ID të përsëritura pa ndryshuar historikun",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        engine.addReport(createEntry(1, 100));
        engine.addReport(createEntry(2, 200));

        const before = engine.listReports();

        expect(() => {
          engine.addReport({
            ...createEntry(1, 300),
            report: createReport(99),
          });
        }).toThrow(
          "Raporti ekziston tashmë në historik: benchmark-1."
        );

        expect(engine.getHistorySize()).toBe(2);
        expect(engine.listReports()).toEqual(before);
        expect(
          engine.getReportById("benchmark-1").report.summary.score
        ).toBe(1);
      }
    );

    it(
      "ruan vetëm raportet më të fundit sipas kufirit maksimal",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 5,
          });

        for (let index = 1; index <= 10; index += 1) {
          engine.addReport(createEntry(index));
        }

        expect(engine.getHistorySize()).toBe(5);

        const retainedIds = engine
          .listReports()
          .map((entry) => entry.id);

        expect(retainedIds).toEqual([
          "benchmark-10",
          "benchmark-9",
          "benchmark-8",
          "benchmark-7",
          "benchmark-6",
        ]);

        for (let index = 1; index <= 5; index += 1) {
          expect(
            engine.getReportById(`benchmark-${index}`)
          ).toBeNull();
        }

        for (let index = 6; index <= 10; index += 1) {
          expect(
            engine.getReportById(`benchmark-${index}`)
          ).not.toBeNull();
        }
      }
    );

    it(
      "ruan renditjen e saktë kur raportet kanë timestamp të njëjtë",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        engine.addReport(createEntry(1, 500));
        engine.addReport(createEntry(2, 500));
        engine.addReport(createEntry(3, 500));
        engine.addReport(createEntry(4, 500));

        expect(
          engine.listReports().map((entry) => entry.id)
        ).toEqual([
          "benchmark-4",
          "benchmark-3",
          "benchmark-2",
          "benchmark-1",
        ]);

        expect(engine.getLatestReport().id).toBe(
          "benchmark-4"
        );
      }
    );

    it(
      "nuk lejon modifikimin e raportit të brendshëm përmes input-it",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        const input = createEntry(1, 100);

        engine.addReport(input);

        input.report.summary.score = 999;
        input.report.results[0].status = "modified";
        input.report.results.push({
          id: "injected-test",
          status: "passed",
        });

        const stored = engine.getReportById("benchmark-1");

        expect(stored.report.summary.score).toBe(1);

        expect(stored.report.results).toHaveLength(3);

        expect(stored.report.results[0].status).toBe(
          "passed"
        );
      }
    );

    it(
      "nuk lejon modifikimin e raportit përmes rezultateve të leximit",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        engine.addReport(createEntry(1, 100));

        const listed = engine.listReports();

        expect(Object.isFrozen(listed)).toBe(true);
        expect(Object.isFrozen(listed[0])).toBe(true);
        expect(Object.isFrozen(listed[0].report)).toBe(true);
        expect(
          Object.isFrozen(listed[0].report.summary)
        ).toBe(true);
        expect(
          Object.isFrozen(listed[0].report.results)
        ).toBe(true);

        expect(() => {
          listed[0].report.summary.score = 500;
        }).toThrow(TypeError);

        expect(
          engine.getReportById("benchmark-1")
            .report.summary.score
        ).toBe(1);
      }
    );

    it(
      "ruan metadata konsistente gjatë shtimit dhe kufizimit të historikut",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 3,
          });

        expect(engine.getMetadata()).toEqual({
          version: "1.0.0",
          maxEntries: 3,
          entryCount: 0,
        });

        for (let index = 1; index <= 5; index += 1) {
          engine.addReport(createEntry(index));
        }

        expect(engine.getHistorySize()).toBe(3);

        expect(engine.getMetadata()).toEqual({
          version: "1.0.0",
          maxEntries: 3,
          entryCount: 3,
        });

        expect(Object.isFrozen(engine.getMetadata())).toBe(
          true
        );
      }
    );

    it(
      "ruan historikun e mbetur saktë pas fshirjes së një raporti",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        for (let index = 1; index <= 10; index += 1) {
          engine.addReport(createEntry(index));
        }

        expect(engine.removeReport("benchmark-5")).toBe(
          true
        );

        expect(engine.removeReport("benchmark-5")).toBe(
          false
        );

        expect(engine.getHistorySize()).toBe(9);

        expect(
          engine.getReportById("benchmark-5")
        ).toBeNull();

        const remaining = engine.listReports();

        expect(remaining).toHaveLength(9);

        expect(
          remaining.some(
            (entry) => entry.id === "benchmark-5"
          )
        ).toBe(false);

        expect(
          new Set(remaining.map((entry) => entry.id)).size
        ).toBe(9);
      }
    );

    it(
      "ruan gjendjen e saktë pas pastrimit dhe shtimit të ri",
      () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine({
            maxEntries: 10,
          });

        engine.addReport(createEntry(1, 100));
        engine.addReport(createEntry(2, 200));
        engine.addReport(createEntry(3, 300));

        expect(engine.clearHistory()).toBe(3);
        expect(engine.clearHistory()).toBe(0);

        expect(engine.getHistorySize()).toBe(0);
        expect(engine.listReports()).toEqual([]);
        expect(engine.getLatestReport()).toBeNull();
        expect(engine.getReportById("benchmark-1")).toBeNull();

        engine.addReport(createEntry(4, 400));

        expect(engine.getHistorySize()).toBe(1);

        expect(engine.getLatestReport().id).toBe(
          "benchmark-4"
        );

        expect(engine.getMetadata().entryCount).toBe(1);
      }
    );
  }
);
