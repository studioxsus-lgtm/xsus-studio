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
    timestamp: overrides.timestamp ?? 1_800_000_000_000,
    report: {
      summary: {
        title: "Immutable Benchmark",
        score: 90,
        ...(overrides.summary ?? {}),
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

describe(
  "Response Quality Benchmark History — Mixed Operations Integrity",
  () => {
    it("ruan integritetin gjatë shtimit, leximit dhe renditjes", () => {
      const engine = createResponseQualityBenchmarkHistoryEngine();

      engine.addReport(
        createReport("mixed-a", { timestamp: 100 }),
      );

      engine.addReport(
        createReport("mixed-b", { timestamp: 300 }),
      );

      engine.addReport(
        createReport("mixed-c", { timestamp: 200 }),
      );

      expect(engine.getHistorySize()).toBe(3);

      expect(engine.getReportById("mixed-a").id).toBe("mixed-a");
      expect(engine.getReportById("mixed-b").id).toBe("mixed-b");
      expect(engine.getReportById("missing-report")).toBeNull();

      const reports = engine.listReports();

      expect(reports.map((entry) => entry.id)).toEqual([
        "mixed-b",
        "mixed-c",
        "mixed-a",
      ]);

      expect(engine.getLatestReport().id).toBe("mixed-b");
      expect(engine.getHistorySize()).toBe(3);
    });

    it("ruan raportet e mbetura pas fshirjes dhe shtimit të raporteve të reja", () => {
      const engine = createResponseQualityBenchmarkHistoryEngine();

      engine.addReport(createReport("delete-a"));
      engine.addReport(createReport("delete-b"));
      engine.addReport(createReport("delete-c"));

      expect(engine.removeReport("delete-b")).toBe(true);
      expect(engine.removeReport("delete-b")).toBe(false);

      expect(engine.getReportById("delete-b")).toBeNull();
      expect(engine.getHistorySize()).toBe(2);

      engine.addReport(
        createReport("delete-d", {
          summary: { score: 95 },
        }),
      );

      expect(engine.getHistorySize()).toBe(3);
      expect(engine.getReportById("delete-a")).not.toBeNull();
      expect(engine.getReportById("delete-c")).not.toBeNull();

      expect(
        engine.getReportById("delete-d").report.summary.score,
      ).toBe(95);

      expect(
        engine.listReports().map((entry) => entry.id).sort(),
      ).toEqual(["delete-a", "delete-c", "delete-d"]);
    });

    it("ruan integritetin pas pastrimit dhe mbushjes së sërishme të historikut", () => {
      const engine = createResponseQualityBenchmarkHistoryEngine();

      engine.addReport(createReport("clear-a"));
      engine.addReport(createReport("clear-b"));

      const previousSnapshot = engine.getReportById("clear-a");

      // clearHistory() kthen numrin e raporteve të pastruara.
      expect(engine.clearHistory()).toBe(2);

      expect(engine.getHistorySize()).toBe(0);
      expect(engine.listReports()).toEqual([]);
      expect(engine.getLatestReport()).toBeNull();

      engine.addReport(createReport("clear-c"));

      expect(engine.getHistorySize()).toBe(1);
      expect(engine.getReportById("clear-a")).toBeNull();
      expect(engine.getReportById("clear-c").id).toBe("clear-c");

      // Snapshot-i i mëparshëm duhet të mbetet i pandryshuar.
      expect(previousSnapshot.id).toBe("clear-a");
      expect(previousSnapshot.report.summary.score).toBe(90);
    });

    it("ruan të dhënat gjatë një cikli të përzier operacionesh", () => {
      const engine = createResponseQualityBenchmarkHistoryEngine();

      engine.addReport(createReport("cycle-a"));
      engine.addReport(createReport("cycle-b"));
      engine.addReport(createReport("cycle-c"));

      const snapshotA = engine.getReportById("cycle-a");

      expect(engine.removeReport("cycle-b")).toBe(true);

      engine.addReport(
        createReport("cycle-d", {
          summary: { score: 96 },
        }),
      );

      expect(engine.getHistorySize()).toBe(3);

      expect(() => {
        snapshotA.report.summary.score = -1;
      }).toThrow(TypeError);

      expect(
        engine.getReportById("cycle-a").report.summary.score,
      ).toBe(90);

      expect(
        engine.listReports().map((entry) => entry.id).sort(),
      ).toEqual(["cycle-a", "cycle-c", "cycle-d"]);

      expect(engine.getReportById("cycle-b")).toBeNull();

      expect(
        engine.getReportById("cycle-d").report.summary.score,
      ).toBe(96);
    });

    it("ruan konsistencën e storage gjatë persistimit, fshirjes dhe rikthimit", async () => {
      const storage = createStorage();
      const engine = createResponseQualityBenchmarkHistoryEngine();

      const persistence = createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

      await persistence.initialize();

      await persistence.addReport(createReport("persist-a"));

      await persistence.addReport(
        createReport("persist-b", {
          summary: { score: 94 },
        }),
      );

      await persistence.flush();

      expect(storage.getSnapshot()).toHaveLength(2);

      expect(
        await persistence.removeReport("persist-a"),
      ).toBe(true);

      await persistence.flush();

      expect(storage.getSnapshot()).toHaveLength(1);
      expect(storage.getSnapshot()[0].id).toBe("persist-b");

      const restoredEngine =
        createResponseQualityBenchmarkHistoryEngine();

      const restoredPersistence =
        createResponseQualityBenchmarkHistoryPersistence({
          engine: restoredEngine,
          storage,
        });

      await restoredPersistence.initialize();

      expect(restoredPersistence.getHistorySize()).toBe(1);
      expect(
        restoredPersistence.getReportById("persist-a"),
      ).toBeNull();

      expect(
        restoredPersistence.getReportById("persist-b").report.summary.score,
      ).toBe(94);
    });

    it("ruan historikun pas pastrimit, persistimit dhe rikthimit", async () => {
      const storage = createStorage();
      const engine = createResponseQualityBenchmarkHistoryEngine();

      const persistence = createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

      await persistence.initialize();

      await persistence.addReport(createReport("reset-a"));
      await persistence.addReport(createReport("reset-b"));

      await persistence.flush();

      await persistence.clearHistory();
      await persistence.flush();

      expect(persistence.getHistorySize()).toBe(0);
      expect(storage.getSnapshot()).toEqual([]);

      const restoredEngine =
        createResponseQualityBenchmarkHistoryEngine();

      const restoredPersistence =
        createResponseQualityBenchmarkHistoryPersistence({
          engine: restoredEngine,
          storage,
        });

      await restoredPersistence.initialize();

      expect(restoredPersistence.getHistorySize()).toBe(0);
      expect(restoredPersistence.listReports()).toEqual([]);
      expect(restoredPersistence.getLatestReport()).toBeNull();
    });

    it("ruan izolimin e raporteve gjatë operacioneve të përziera të leximit", async () => {
      const storage = createStorage();
      const engine = createResponseQualityBenchmarkHistoryEngine();

      const persistence = createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

      await persistence.initialize();

      await persistence.addReport(createReport("isolation-a"));
      await persistence.addReport(createReport("isolation-b"));

      await persistence.flush();

      const firstSnapshot =
        persistence.getReportById("isolation-a");

      const listSnapshot = persistence.listReports();

      expect(() => {
        firstSnapshot.report.summary.score = -1;
      }).toThrow(TypeError);

      expect(() => {
        listSnapshot[0].report.results.push({
          name: "injected",
          score: 0,
          passed: false,
        });
      }).toThrow(TypeError);

      await persistence.addReport(
        createReport("isolation-c", {
          summary: { score: 99 },
        }),
      );

      await persistence.flush();

      expect(persistence.getHistorySize()).toBe(3);

      expect(
        persistence.getReportById("isolation-a").report.summary.score,
      ).toBe(90);

      expect(
        persistence.getReportById("isolation-b").report.summary.score,
      ).toBe(90);

      expect(
        persistence.getReportById("isolation-c").report.summary.score,
      ).toBe(99);

      expect(firstSnapshot.report.summary.score).toBe(90);
      expect(listSnapshot).toHaveLength(2);
      expect(storage.getSnapshot()).toHaveLength(3);
    });

    it("ruan renditjen dhe të dhënat pas disa cikleve persistim-rikthim", async () => {
      const storage = createStorage();

      const firstEngine =
        createResponseQualityBenchmarkHistoryEngine();

      const firstPersistence =
        createResponseQualityBenchmarkHistoryPersistence({
          engine: firstEngine,
          storage,
        });

      await firstPersistence.initialize();

      await firstPersistence.addReport(
        createReport("round-a", { timestamp: 100 }),
      );

      await firstPersistence.addReport(
        createReport("round-b", { timestamp: 300 }),
      );

      await firstPersistence.addReport(
        createReport("round-c", { timestamp: 200 }),
      );

      await firstPersistence.flush();

      let currentPersistence = firstPersistence;

      for (let cycle = 0; cycle < 3; cycle += 1) {
        const currentEngine =
          createResponseQualityBenchmarkHistoryEngine();

        currentPersistence =
          createResponseQualityBenchmarkHistoryPersistence({
            engine: currentEngine,
            storage,
          });

        await currentPersistence.initialize();

        expect(currentPersistence.getHistorySize()).toBe(3);

        expect(
          currentPersistence.listReports().map((entry) => entry.id),
        ).toEqual(["round-b", "round-c", "round-a"]);

        expect(currentPersistence.getLatestReport().id).toBe("round-b");

        expect(
          currentPersistence.getReportById("round-a").report.summary.score,
        ).toBe(90);

        await currentPersistence.flush();
      }

      expect(currentPersistence.getHistorySize()).toBe(3);
      expect(storage.getSnapshot()).toHaveLength(3);
    });
  },
);
