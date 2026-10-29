import { describe, it, expect } from "vitest";

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
        title: "Failure Recovery Benchmark",
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

function createPersistence(storage) {
  const engine = createResponseQualityBenchmarkHistoryEngine();

  const persistence = createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

  return { engine, persistence };
}

describe("XSUS AI Core — Clear and Restore Failure Recovery Integrity", () => {
  it("rikuperon radhën e shkrimeve pas një dështimi të përkohshëm të ruajtjes", async () => {
    const storage = createStorage([
      createReport("initial-report"),
    ]);

    const originalSaveHistory = storage.saveHistory.bind(storage);
    let shouldFail = true;

    storage.saveHistory = async (entries) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Temporary storage failure");
      }

      return originalSaveHistory(entries);
    };

    const { persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("report-after-failure"),
    );

    await expect(persistence.flush()).rejects.toThrow();

    await persistence.addReport(
      createReport("report-after-recovery"),
    );

    await persistence.flush();

    expect(storage.getSnapshot().map((report) => report.id)).toContain(
      "report-after-recovery",
    );

    expect(persistence.getReportById("report-after-recovery")).not.toBeNull();
  });

  it("nuk i humbet raportet në memorie kur ruajtja dështon", async () => {
    const storage = createStorage();
    const originalSaveHistory = storage.saveHistory.bind(storage);

    storage.saveHistory = async () => {
      throw new Error("Temporary storage failure");
    };

    const { persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("memory-report"),
    );

    await expect(persistence.flush()).rejects.toThrow();

    expect(persistence.getReportById("memory-report")).not.toBeNull();

    storage.saveHistory = originalSaveHistory;

    await persistence.addReport(
      createReport("recovery-report"),
    );

    await persistence.flush();

    expect(storage.getSnapshot().map((report) => report.id)).toContain(
      "recovery-report",
    );
  });

  it("lejon pastrimin dhe ruajtjen pas rikuperimit nga gabimi", async () => {
    const storage = createStorage([
      createReport("old-report"),
    ]);

    const originalSaveHistory = storage.saveHistory.bind(storage);
    let shouldFail = true;

    storage.saveHistory = async (entries) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Temporary storage failure");
      }

      return originalSaveHistory(entries);
    };

    const { persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("temporary-report"),
    );

    await expect(persistence.flush()).rejects.toThrow();

    await persistence.clearHistory();
    await persistence.flush();

    expect(persistence.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);
  });

  it("raporton dështimin e rikthimit nga storage", async () => {
    const storage = createStorage([
      createReport("stored-report"),
    ]);

    storage.loadHistory = async () => {
      throw new Error("Temporary load failure");
    };

    const { persistence } = createPersistence(storage);

    await expect(persistence.initialize()).rejects.toThrow(
      "Temporary load failure",
    );
  });

  it("rikthen të dhënat kur inicializimi provohet përsëri pas dështimit", async () => {
    const storage = createStorage([
      createReport("restored-report"),
    ]);

    const originalLoadHistory = storage.loadHistory.bind(storage);
    let shouldFail = true;

    storage.loadHistory = async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Temporary load failure");
      }

      return originalLoadHistory();
    };

    const { persistence } = createPersistence(storage);

    await expect(persistence.initialize()).rejects.toThrow(
      "Temporary load failure",
    );

    await persistence.initialize();

    expect(persistence.getHistorySize()).toBe(1);
    expect(
      persistence.getReportById("restored-report"),
    ).not.toBeNull();
  });
});
