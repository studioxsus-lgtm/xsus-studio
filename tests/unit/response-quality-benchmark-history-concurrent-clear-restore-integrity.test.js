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
        title: "Concurrent Clear Restore Benchmark",
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

describe("XSUS AI Core — Concurrent Clear and Restore Integrity", () => {
  it("ruan integritetin kur shtimi dhe pastrimi nisin njëri pas tjetrit pa pritje", async () => {
    const storage = createStorage([
      createReport("initial-report"),
    ]);

    const { persistence } = createPersistence(storage);
    await persistence.initialize();

    const addOperation = persistence.addReport(
      createReport("new-report", {
        summary: { score: 96 },
      }),
    );

    const clearOperation = persistence.clearHistory();

    await Promise.all([addOperation, clearOperation]);
    await persistence.flush();

    expect(persistence.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);
  });

  it("ruan rendin e operacioneve të pastrimit dhe shtimit", async () => {
    const storage = createStorage([
      createReport("old-report"),
    ]);

    const { persistence } = createPersistence(storage);
    await persistence.initialize();

    await persistence.clearHistory();

    await persistence.addReport(
      createReport("after-clear", {
        summary: { score: 98 },
      }),
    );

    await persistence.flush();

    expect(persistence.getHistorySize()).toBe(1);
    expect(storage.getSnapshot()).toHaveLength(1);
    expect(storage.getSnapshot()[0].id).toBe("after-clear");
    expect(
      persistence.getReportById("old-report"),
    ).toBeNull();
  });

  it("rikthen gjendjen përfundimtare nga storage pas operacioneve të ndërthurura", async () => {
    const storage = createStorage([
      createReport("report-a"),
      createReport("report-b"),
    ]);

    const first = createPersistence(storage);
    await first.persistence.initialize();

    const addOperation = first.persistence.addReport(
      createReport("report-c", {
        summary: { score: 95 },
      }),
    );

    const clearOperation = first.persistence.clearHistory();

    await Promise.all([addOperation, clearOperation]);
    await first.persistence.flush();

    const restored = createPersistence(storage);
    await restored.persistence.initialize();

    expect(restored.persistence.getHistorySize()).toBe(0);
    expect(restored.persistence.listReports()).toEqual([]);
    expect(storage.getSnapshot()).toEqual([]);
  });

  it("lejon shtimin e një raporti të ri pas përfundimit të ciklit të pastrimit", async () => {
    const storage = createStorage([
      createReport("before-clear"),
    ]);

    const { persistence } = createPersistence(storage);
    await persistence.initialize();

    await Promise.all([
      persistence.clearHistory(),
      persistence.flush(),
    ]);

    await persistence.addReport(
      createReport("after-clear", {
        summary: { score: 99 },
      }),
    );

    await persistence.flush();

    const restored = createPersistence(storage);
    await restored.persistence.initialize();

    expect(restored.persistence.getHistorySize()).toBe(1);
    expect(
      restored.persistence.getReportById("before-clear"),
    ).toBeNull();
    expect(
      restored.persistence.getReportById("after-clear").report.summary.score,
    ).toBe(99);
  });
});
