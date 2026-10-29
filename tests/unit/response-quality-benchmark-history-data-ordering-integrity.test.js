import { describe, it, expect } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index, overrides = {}) {
  return {
    id: `ordering-${index}`,
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

describe("XSUS AI Core — Benchmark History Data Ordering Integrity", () => {
  it("ruan numrat sequence unikë dhe të njëpasnjëshëm", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    for (const index of [5, 2, 8, 1, 7]) {
      await persistence.addReport(createEntry(index));
    }

    await persistence.flush();

    const savedHistory = storage.getPersistedHistory();

    expect(savedHistory).toHaveLength(5);

    const sequences = savedHistory
      .map((entry) => entry.sequence)
      .sort((a, b) => a - b);

    expect(sequences).toEqual([1, 2, 3, 4, 5]);

    expect(
      new Set(savedHistory.map((entry) => entry.id)).size,
    ).toBe(5);
  });

  it("ruan lidhjen midis identifikuesve dhe sequence pas ruajtjes", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    const identifiers = [
      "ordering-30",
      "ordering-10",
      "ordering-40",
      "ordering-20",
    ];

    for (const id of identifiers) {
      const index = Number(id.split("-")[1]);
      await persistence.addReport(createEntry(index));
    }

    await persistence.flush();

    const savedHistory = storage.getPersistedHistory();

    expect(savedHistory).toHaveLength(4);

    for (const [index, id] of identifiers.entries()) {
      const entry = savedHistory.find((item) => item.id === id);

      expect(entry).toBeDefined();
      expect(entry.sequence).toBe(index + 1);
    }
  });

  it("ruan identifikuesit dhe sequence pas disa cikleve flush", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport(createEntry(1));
    await persistence.addReport(createEntry(2));
    await persistence.flush();

    const firstSnapshot = storage.getPersistedHistory();

    await persistence.addReport(createEntry(3));
    await persistence.addReport(createEntry(4));
    await persistence.flush();
    await persistence.flush();

    const finalHistory = storage.getPersistedHistory();

    expect(finalHistory).toHaveLength(4);

    for (const previousEntry of firstSnapshot) {
      expect(finalHistory).toContainEqual(previousEntry);
    }

    expect(
      finalHistory.find((entry) => entry.id === "ordering-3")?.sequence,
    ).toBe(3);

    expect(
      finalHistory.find((entry) => entry.id === "ordering-4")?.sequence,
    ).toBe(4);
  });

  it("ruan identifikuesit dhe sequence pas rikthimit të historikut", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    for (const index of [9, 3, 6, 1]) {
      await persistence.addReport(createEntry(index));
    }

    await persistence.flush();

    const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage,
      });

    await restoredPersistence.initialize();

    expect(restoredPersistence.getHistorySize()).toBe(4);

    const expectedSequenceById = new Map([
      ["ordering-9", 1],
      ["ordering-3", 2],
      ["ordering-6", 3],
      ["ordering-1", 4],
    ]);

    for (const [id, sequence] of expectedSequenceById) {
      const entry = restoredPersistence.getReportById(id);

      expect(entry).toBeDefined();
      expect(entry.sequence).toBe(sequence);
    }

    expect(
      restoredEngine
        .listReports()
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([
      "ordering-1",
      "ordering-3",
      "ordering-6",
      "ordering-9",
    ]);
  });

  it("ruan renditjen e historikut të ruajtur pas shtimeve të mëtejshme", async () => {
    const { storage, persistence } = createHarness();

    await persistence.initialize();

    for (const index of [12, 4, 15]) {
      await persistence.addReport(createEntry(index));
    }

    await persistence.flush();

    const firstHistory = storage.getPersistedHistory();

    await persistence.addReport(createEntry(7));
    await persistence.addReport(createEntry(2));
    await persistence.flush();

    const finalHistory = storage.getPersistedHistory();

    expect(finalHistory).toHaveLength(5);

    expect(
      finalHistory
        .map((entry) => entry.sequence)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5]);

    for (const previousEntry of firstHistory) {
      expect(finalHistory).toContainEqual(previousEntry);
    }

    expect(
      new Set(finalHistory.map((entry) => entry.id)).size,
    ).toBe(5);
  });
});
