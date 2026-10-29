import { describe, it, expect } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index, overrides = {}) {
  return {
    id: `isolation-${index}`,
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
          details: `Detajet e raportit ${index}, rezultati i parë.`,
        },
        {
          id: `case-${index}-2`,
          status: "passed",
          details: `Detajet e raportit ${index}, rezultati i dytë.`,
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

describe("XSUS AI Core — Benchmark History Data Isolation Integrity", () => {
  it("ruan izolimin e përmbajtjes midis raporteve të ndryshme", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    const firstEntry = createEntry(1);
    const secondEntry = createEntry(2);

    await persistence.addReport(firstEntry);
    await persistence.addReport(secondEntry);
    await persistence.flush();

    const savedHistory = storage.getPersistedHistory();

    expect(savedHistory).toHaveLength(2);

    const savedFirst = savedHistory.find(
      (entry) => entry.id === "isolation-1",
    );

    const savedSecond = savedHistory.find(
      (entry) => entry.id === "isolation-2",
    );

    expect(savedFirst.report.results[0].details).toBe(
      "Detajet e raportit 1, rezultati i parë.",
    );

    expect(savedSecond.report.results[0].details).toBe(
      "Detajet e raportit 2, rezultati i parë.",
    );

    expect(savedFirst.report.results[0].details).not.toBe(
      savedSecond.report.results[0].details,
    );
  });

  it("izolon ndryshimet në kopjen e lexuar nga storage", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();
    await persistence.addReport(createEntry(10));
    await persistence.flush();

    const originalHistory = storage.getPersistedHistory();
    const loadedHistory = await storage.loadHistory();

    loadedHistory[0].report.summary.score = -1;
    loadedHistory[0].report.results[0].details = "U ndryshua kopja.";
    loadedHistory.push(createEntry(99));

    expect(storage.getPersistedHistory()).toEqual(originalHistory);
    expect(storage.getPersistedHistory()).toHaveLength(1);

    expect(
      storage.getPersistedHistory()[0].report.summary.score,
    ).toBe(100);

    expect(
      storage.getPersistedHistory()[0].report.results[0].details,
    ).toBe("Detajet e raportit 10, rezultati i parë.");
  });

  it("ruan integritetin e raportit të parë pas shtimit të raportit të dytë", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport(createEntry(20));
    await persistence.flush();

    const firstSnapshot = storage
      .getPersistedHistory()
      .find((entry) => entry.id === "isolation-20");

    await persistence.addReport(createEntry(21));
    await persistence.flush();

    const finalHistory = storage.getPersistedHistory();

    const finalFirst = finalHistory.find(
      (entry) => entry.id === "isolation-20",
    );

    const finalSecond = finalHistory.find(
      (entry) => entry.id === "isolation-21",
    );

    expect(finalHistory).toHaveLength(2);
    expect(finalFirst).toEqual(firstSnapshot);
    expect(finalSecond).toMatchObject(createEntry(21));

    expect(finalFirst.sequence).toBe(1);
    expect(finalSecond.sequence).toBe(2);
  });

  it("ruan izolimin e raporteve pas rikthimit të historikut", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport(createEntry(30));
    await persistence.addReport(createEntry(31));
    await persistence.flush();

    const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage,
      });

    await restoredPersistence.initialize();

    const firstRestored =
      restoredPersistence.getReportById("isolation-30");

    const secondRestored =
      restoredPersistence.getReportById("isolation-31");

    expect(firstRestored).toMatchObject(createEntry(30));
    expect(secondRestored).toMatchObject(createEntry(31));

    expect(firstRestored.sequence).toBe(1);
    expect(secondRestored.sequence).toBe(2);

    expect(firstRestored.report.results[0].details).not.toBe(
      secondRestored.report.results[0].details,
    );
  });

  it("ruan të dhënat e storage pas ndryshimit të një kopjeje të historikut", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport(createEntry(40));
    await persistence.addReport(createEntry(41));
    await persistence.flush();

    const originalHistory = storage.getPersistedHistory();
    const copiedHistory = storage.getPersistedHistory();

    copiedHistory[0].report.summary.score = 0;
    copiedHistory[0].report.results[0].status = "modified";
    copiedHistory.splice(1, 1);

    expect(storage.getPersistedHistory()).toEqual(originalHistory);
    expect(storage.getPersistedHistory()).toHaveLength(2);

    expect(
      storage.getPersistedHistory()[0].report.summary.score,
    ).toBe(100);

    expect(
      storage.getPersistedHistory()[0].report.results[0].status,
    ).toBe("passed");
  });
});
