import { describe, it, expect } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index) {
  return {
    id: `repeated-${index}`,
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
          details: `Raporti ${index}, rezultati i parë.`,
        },
        {
          id: `case-${index}-2`,
          status: "passed",
          details: `Raporti ${index}, rezultati i dytë.`,
        },
      ],
    },
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

describe(
  "XSUS AI Core — Benchmark History Repeated Operations Integrity",
  () => {
    it("ruan të gjitha raportet pas shtimeve të njëpasnjëshme", async () => {
      const { engine, storage, persistence } = createHarness();

      await persistence.initialize();

      const entries = Array.from(
        { length: 25 },
        (_, index) => createEntry(index + 1),
      );

      for (const entry of entries) {
        await persistence.addReport(entry);
      }

      await persistence.flush();

      const engineIds = engine
        .listReports()
        .map((entry) => entry.id)
        .sort();

      const storageIds = storage
        .getPersistedHistory()
        .map((entry) => entry.id)
        .sort();

      expect(persistence.getHistorySize()).toBe(25);
      expect(engineIds).toHaveLength(25);
      expect(storageIds).toEqual(engineIds);
      expect(new Set(storageIds).size).toBe(25);
    });

    it("ruan identifikuesit dhe përmbajtjen pas disa cikleve flush", async () => {
      const { storage, persistence } = createHarness();

      await persistence.initialize();

      for (let index = 1; index <= 12; index += 1) {
        await persistence.addReport(createEntry(index));

        if (index % 3 === 0) {
          await persistence.flush();
        }
      }

      await persistence.flush();

      const savedHistory = storage.getPersistedHistory();

      expect(savedHistory).toHaveLength(12);

      for (let index = 1; index <= 12; index += 1) {
        const savedEntry = savedHistory.find(
          (entry) => entry.id === `repeated-${index}`,
        );

        expect(savedEntry).toBeDefined();
        expect(savedEntry.report.results).toHaveLength(2);
        expect(savedEntry.report.summary.score).toBe(100);
      }

      expect(
        new Set(savedHistory.map((entry) => entry.id)).size,
      ).toBe(12);
    });

    it("nuk humb raportet kur flush thirret disa herë", async () => {
      const { storage, persistence } = createHarness();

      await persistence.initialize();

      await persistence.addReport(createEntry(101));
      await persistence.addReport(createEntry(102));

      await persistence.flush();
      await persistence.flush();
      await persistence.flush();

      const firstSnapshot = storage.getPersistedHistory();

      expect(firstSnapshot).toHaveLength(2);

      await persistence.addReport(createEntry(103));
      await persistence.flush();
      await persistence.flush();

      const finalHistory = storage.getPersistedHistory();

      expect(finalHistory).toHaveLength(3);

      expect(
        finalHistory.map((entry) => entry.id).sort(),
      ).toEqual([
        "repeated-101",
        "repeated-102",
        "repeated-103",
      ]);

      expect(
        finalHistory.find((entry) => entry.id === "repeated-101"),
      ).toEqual(
        firstSnapshot.find((entry) => entry.id === "repeated-101"),
      );

      expect(
        finalHistory.find((entry) => entry.id === "repeated-102"),
      ).toEqual(
        firstSnapshot.find((entry) => entry.id === "repeated-102"),
      );
    });

    it("rikthen të gjitha raportet pas shumë shtimeve dhe ruajtjeve", async () => {
      const { storage, persistence } = createHarness();

      await persistence.initialize();

      const entries = Array.from(
        { length: 15 },
        (_, index) => createEntry(index + 201),
      );

      for (let index = 0; index < entries.length; index += 1) {
        await persistence.addReport(entries[index]);

        if ((index + 1) % 5 === 0) {
          await persistence.flush();
        }
      }

      await persistence.flush();

      const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

      const restoredPersistence =
        createResponseQualityBenchmarkHistoryPersistence({
          engine: restoredEngine,
          storage,
        });

      await restoredPersistence.initialize();

      expect(restoredPersistence.getHistorySize()).toBe(15);

      const restoredIds = restoredEngine
        .listReports()
        .map((entry) => entry.id)
        .sort();

      expect(restoredIds).toEqual(
        entries.map((entry) => entry.id).sort(),
      );

      for (const entry of entries) {
        expect(
          restoredPersistence.getReportById(entry.id),
        ).toMatchObject(entry);
      }
    });

    it("ruan sekuencat dhe identifikuesit unikë gjatë shtimeve të përsëritura", async () => {
      const { storage, persistence } = createHarness();

      await persistence.initialize();

      for (let index = 1; index <= 10; index += 1) {
        await persistence.addReport(createEntry(index));
      }

      await persistence.flush();

      const savedHistory = storage.getPersistedHistory();

      expect(savedHistory).toHaveLength(10);

      const sequences = savedHistory
        .map((entry) => entry.sequence)
        .sort((a, b) => a - b);

      expect(sequences).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);

      expect(
        new Set(savedHistory.map((entry) => entry.id)).size,
      ).toBe(10);
    });
  },
);
