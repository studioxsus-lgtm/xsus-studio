import { describe, expect, it } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createReport(id, overrides = {}) {
  return {
    id,
    timestamp: 1_800_000_000_000,
    report: {
      summary: {
        title: "Immutable Benchmark",
        score: 90,
        ...overrides.summary,
      },
      results: overrides.results ?? [
        {
          name: "response-quality",
          score: 90,
          passed: true,
        },
      ],
    },
  };
}

function createStorage(initialHistory = []) {
  let history = structuredClone(initialHistory);

  return {
    async loadHistory() {
      return structuredClone(history);
    },

    async saveHistory(nextHistory) {
      history = structuredClone(nextHistory);
    },

    getSnapshot() {
      return structuredClone(history);
    },
  };
}

describe("Response Quality Benchmark History — Repeated Mutations Integrity", () => {
  it("ruan summary të pandryshuar pas përpjekjeve të përsëritura për modifikim", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createReport("mutation-summary"));

    const entry = engine.getReportById("mutation-summary");

    for (let index = 0; index < 10; index += 1) {
      expect(() => {
        entry.report.summary.score = index;
      }).toThrow(TypeError);

      expect(() => {
        entry.report.summary.title = `Changed ${index}`;
      }).toThrow(TypeError);
    }

    const saved = engine.getReportById("mutation-summary");

    expect(saved.report.summary.score).toBe(90);
    expect(saved.report.summary.title).toBe("Immutable Benchmark");
  });

  it("ruan rezultatet pas përpjekjeve të përsëritura për ndryshimin e array-it", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createReport("mutation-results"));

    const entry = engine.getReportById("mutation-results");

    for (let index = 0; index < 10; index += 1) {
      expect(() => {
        entry.report.results.push({
          name: `injected-${index}`,
          score: 0,
          passed: false,
        });
      }).toThrow(TypeError);

      expect(() => {
        entry.report.results.splice(0, 1);
      }).toThrow(TypeError);
    }

    const saved = engine.getReportById("mutation-results");

    expect(saved.report.results).toHaveLength(1);
    expect(saved.report.results[0]).toEqual({
      name: "response-quality",
      score: 90,
      passed: true,
    });
  });

  it("izolon raportin e ruajtur nga ndryshimet e përsëritura të objektit origjinal", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();
    const original = createReport("mutation-input");

    engine.addReport(original);

    for (let index = 0; index < 10; index += 1) {
      original.report.summary.score = index;
      original.report.summary.title = `External change ${index}`;
      original.report.results[0].score = index;
      original.report.results.push({
        name: `external-${index}`,
        score: index,
        passed: false,
      });
    }

    const saved = engine.getReportById("mutation-input");

    expect(saved.report.summary.score).toBe(90);
    expect(saved.report.summary.title).toBe("Immutable Benchmark");
    expect(saved.report.results).toHaveLength(1);
    expect(saved.report.results[0].score).toBe(90);
  });

  it("mbron të dhënat nga përpjekjet për ndryshim të kopjeve të marra veçmas", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createReport("mutation-snapshots"));

    for (let index = 0; index < 10; index += 1) {
      const snapshot = engine.getReportById("mutation-snapshots");

      expect(() => {
        snapshot.report.summary.score = index;
      }).toThrow(TypeError);

      expect(() => {
        snapshot.report.results[0].score = index;
      }).toThrow(TypeError);
    }

    const saved = engine.getReportById("mutation-snapshots");

    expect(saved.report.summary.score).toBe(90);
    expect(saved.report.results[0].score).toBe(90);
  });

  it("ruan integritetin e historikut pas ndryshimeve të përsëritura të listave", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();

    engine.addReport(createReport("list-a"));
    engine.addReport(createReport("list-b"));
    engine.addReport(createReport("list-c"));

    for (let index = 0; index < 5; index += 1) {
      const reports = engine.listReports();

      expect(reports).toHaveLength(3);

      expect(() => {
        reports.push(createReport(`injected-${index}`));
      }).toThrow(TypeError);

      expect(() => {
        reports[0].report.summary.score = index;
      }).toThrow(TypeError);

      expect(() => {
        reports[0].report.results[0].passed = false;
      }).toThrow(TypeError);
    }

    const savedReports = engine.listReports();
    const savedIds = savedReports.map((entry) => entry.id);

    expect(savedReports).toHaveLength(3);
    expect(savedIds.sort()).toEqual(["list-a", "list-b", "list-c"]);

    for (const entry of savedReports) {
      expect(entry.report.summary.score).toBe(90);
      expect(entry.report.results[0].passed).toBe(true);
    }
  });

  it("ruan integritetin pas shtimit të shumë raporteve dhe ndryshimit të snapshot-eve të vjetra", () => {
    const engine = createResponseQualityBenchmarkHistoryEngine();
    const originalSnapshots = [];

    for (let index = 0; index < 10; index += 1) {
      const id = `repeated-${index}`;

      engine.addReport(
        createReport(id, {
          summary: {
            score: 90 + index,
          },
        }),
      );

      originalSnapshots.push(engine.getReportById(id));
    }

    for (let index = 0; index < originalSnapshots.length; index += 1) {
      const snapshot = originalSnapshots[index];

      expect(() => {
        snapshot.report.summary.score = -1;
      }).toThrow(TypeError);

      expect(() => {
        snapshot.report.results[0].score = -1;
      }).toThrow(TypeError);
    }

    expect(engine.getHistorySize()).toBe(10);

    for (let index = 0; index < 10; index += 1) {
      const saved = engine.getReportById(`repeated-${index}`);

      expect(saved.report.summary.score).toBe(90 + index);
      expect(saved.report.results[0].score).toBe(90);
    }
  });

  it("izolon snapshot-et e storage nga ndryshimet e përsëritura të konsumatorit", async () => {
    const storage = createStorage([
      createReport("storage-isolation"),
    ]);

    for (let index = 0; index < 10; index += 1) {
      const snapshot = storage.getSnapshot();

      snapshot[0].report.summary.score = index;
      snapshot[0].report.summary.title = `Storage change ${index}`;
      snapshot.push(createReport(`storage-injected-${index}`));
    }

    const stored = storage.getSnapshot();

    expect(stored).toHaveLength(1);
    expect(stored[0].report.summary.score).toBe(90);
    expect(stored[0].report.summary.title).toBe("Immutable Benchmark");
  });

  it("ruan integritetin pas persistimit, rikthimit dhe përpjekjeve të përsëritura për modifikim", async () => {
    const storage = createStorage();
    const engine = createResponseQualityBenchmarkHistoryEngine();

    const persistence = createResponseQualityBenchmarkHistoryPersistence({
      engine,
      storage,
    });

    await persistence.initialize();

    await persistence.addReport(
      createReport("restore-integrity", {
        summary: {
          score: 97,
        },
        results: [
          {
            name: "response-quality",
            score: 97,
            passed: true,
          },
          {
            name: "consistency",
            score: 95,
            passed: true,
          },
        ],
      }),
    );

    await persistence.flush();

    const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage,
      });

    await restoredPersistence.initialize();

    for (let index = 0; index < 10; index += 1) {
      const snapshot = restoredPersistence.getReportById(
        "restore-integrity",
      );

      expect(snapshot).not.toBeNull();

      expect(() => {
        snapshot.report.summary.score = index;
      }).toThrow(TypeError);

      expect(() => {
        snapshot.report.results[0].score = index;
      }).toThrow(TypeError);

      expect(() => {
        snapshot.report.results.push({
          name: `injected-${index}`,
          score: 0,
          passed: false,
        });
      }).toThrow(TypeError);
    }

    const restored = restoredPersistence.getReportById(
      "restore-integrity",
    );

    expect(restored.report.summary.score).toBe(97);
    expect(restored.report.summary.title).toBe("Immutable Benchmark");
    expect(restored.report.results).toHaveLength(2);
    expect(restored.report.results[0].score).toBe(97);
    expect(restored.report.results[1].score).toBe(95);

    const stored = storage.getSnapshot();

    expect(stored).toHaveLength(1);
    expect(stored[0].report.summary.score).toBe(97);
    expect(stored[0].report.results).toHaveLength(2);
  });
});
