import { describe, it, expect } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index, overrides = {}) {
  return {
    id: `consistency-${index}`,
    timestamp: index * 100,
    report: {
      summary: {
        total: 2,
        passed: 2,
        failed: 0,
        score: 100,
      },
      results: [
        {
          id: `case-${index}-1`,
          status: "passed",
        },
        {
          id: `case-${index}-2`,
          status: "passed",
        },
      ],
    },
    ...overrides,
  };
}

function createStorage(initialHistory = []) {
  let persistedHistory = structuredClone(initialHistory);

  return {
    async loadHistory() {
      return structuredClone(persistedHistory);
    },

    async saveHistory(history) {
      persistedHistory = structuredClone(history);
    },

    getPersistedHistory() {
      return structuredClone(persistedHistory);
    },
  };
}

function createHarness(initialHistory = []) {
  const engine = createResponseQualityBenchmarkHistoryEngine();
  const storage = createStorage(initialHistory);

  const persistence = createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

  return {
    engine,
    storage,
    persistence,
  };
}

describe("XSUS AI Core — Benchmark History Data Consistency Integrity", () => {
  it("ruan të njëjtët identifikues në engine dhe storage", async () => {
    const { engine, storage, persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport(createEntry(1));
    await persistence.addReport(createEntry(2));
    await persistence.addReport(createEntry(3));

    await persistence.flush();

    const engineIds = engine
      .listReports()
      .map((entry) => entry.id)
      .sort();

    const storageIds = storage
      .getPersistedHistory()
      .map((entry) => entry.id)
      .sort();

    expect(engineIds).toEqual([
      "consistency-1",
      "consistency-2",
      "consistency-3",
    ]);

    expect(storageIds).toEqual(engineIds);
    expect(persistence.getHistorySize()).toBe(3);
  });

  it("ruan përmbajtjen e raporteve gjatë rikthimit", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    const entry = createEntry(10, {
      report: {
        summary: {
          total: 3,
          passed: 2,
          failed: 1,
          score: 66,
        },
        results: [
          {
            id: "case-10-1",
            status: "passed",
          },
          {
            id: "case-10-2",
            status: "passed",
          },
          {
            id: "case-10-3",
            status: "failed",
            details: "Rezultati i pritshëm nuk u përputh.",
          },
        ],
      },
    });

    await persistence.addReport(entry);
    await persistence.flush();

    const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage,
      });

    await restoredPersistence.initialize();

    const restoredEntry =
      restoredPersistence.getReportById("consistency-10");

    expect(restoredEntry).toEqual(entry);
    expect(restoredPersistence.getHistorySize()).toBe(1);
  });

  it("nuk lejon që ndryshimi i të dhënave të lexuara të ndryshojë storage-in", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();
    await persistence.addReport(createEntry(20));
    await persistence.flush();

    const beforeMutation = storage.getPersistedHistory();

    const loadedHistory = await storage.loadHistory();

    loadedHistory[0].report.summary.score = -999;
    loadedHistory[0].report.results[0].status = "modified";

    expect(storage.getPersistedHistory()).toEqual(beforeMutation);
    expect(storage.getPersistedHistory()[0].report.summary.score).toBe(100);
    expect(
      storage.getPersistedHistory()[0].report.results[0].status,
    ).toBe("passed");
  });

  it("ruan të dhënat e raporteve të tjera pas shtimit të një raporti të ri", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    const firstEntry = createEntry(30);
    const secondEntry = createEntry(31);

    await persistence.addReport(firstEntry);
    await persistence.flush();

    const firstSnapshot = storage.getPersistedHistory();

    await persistence.addReport(secondEntry);
    await persistence.flush();

    const finalHistory = storage.getPersistedHistory();

    expect(finalHistory).toHaveLength(2);
    expect(finalHistory).toContainEqual(firstEntry);
    expect(finalHistory).toContainEqual(secondEntry);

    expect(
      finalHistory.find((entry) => entry.id === "consistency-30"),
    ).toEqual(firstSnapshot[0]);
  });

  it("rikthen të gjithë historikun pa humbur identifikuesit ose përmbajtjen", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    const entries = [
      createEntry(40),
      createEntry(41),
      createEntry(42),
      createEntry(43),
    ];

    for (const entry of entries) {
      await persistence.addReport(entry);
    }

    await persistence.flush();

    const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage,
      });

    await restoredPersistence.initialize();

    expect(restoredPersistence.getHistorySize()).toBe(entries.length);

    for (const entry of entries) {
      expect(
        restoredPersistence.getReportById(entry.id),
      ).toEqual(entry);
    }

    expect(
      restoredEngine
        .listReports()
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(
      entries
        .map((entry) => entry.id)
        .sort(),
    );
  });
});
