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

    await expect(
      persistence.addReport(createReport("report-after-failure")),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    await persistence.addReport(
      createReport("report-after-recovery"),
    );

    await persistence.flush();

    const savedIds = storage
      .getSnapshot()
      .map((report) => report.id);

    expect(savedIds).toContain("report-after-recovery");

    expect(
      persistence.getReportById("report-after-recovery"),
    ).not.toBeNull();
  });

  it("ruan raportet në memorie kur ruajtja dështon dhe rikuperon ruajtjen", async () => {
    const storage = createStorage();
    const originalSaveHistory = storage.saveHistory.bind(storage);

    storage.saveHistory = async () => {
      throw new Error("Temporary storage failure");
    };

    const { persistence } = createPersistence(storage);

    await persistence.initialize();

    await expect(
      persistence.addReport(createReport("memory-report")),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    expect(
      persistence.getReportById("memory-report"),
    ).not.toBeNull();

    storage.saveHistory = originalSaveHistory;

    await persistence.addReport(
      createReport("recovery-report"),
    );

    await persistence.flush();

    const savedIds = storage
      .getSnapshot()
      .map((report) => report.id);

    expect(savedIds).toContain("recovery-report");
    expect(savedIds).toContain("memory-report");
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

    await expect(
      persistence.addReport(createReport("temporary-report")),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    await persistence.clearHistory();
    await persistence.flush();

    expect(persistence.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);
  });

  it("raporton gabimin standard kur rikthimi nga storage dështon", async () => {
    const storage = createStorage([
      createReport("stored-report"),
    ]);

    storage.loadHistory = async () => {
      throw new Error("Temporary load failure");
    };

    const { persistence } = createPersistence(storage);

    await expect(
      persistence.initialize(),
    ).rejects.toThrow(
      "Inicializimi i historikut benchmark dështoi.",
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

    await expect(
      persistence.initialize(),
    ).rejects.toThrow(
      "Inicializimi i historikut benchmark dështoi.",
    );

    await persistence.initialize();

    expect(persistence.getHistorySize()).toBe(1);

    expect(
      persistence.getReportById("restored-report"),
    ).not.toBeNull();
  });
});
