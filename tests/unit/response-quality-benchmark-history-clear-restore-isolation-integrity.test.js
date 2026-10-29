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
        title: "Clear Restore Isolation Benchmark",
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

describe("XSUS AI Core — Clear and Restore Isolation Integrity", () => {
  it("ruan izolimin e historikut në dy instanca", async () => {
    const storage = createStorage([
      createReport("isolation-a"),
      createReport("isolation-b"),
    ]);

    const first = createPersistence(storage);
    const second = createPersistence(storage);

    await first.persistence.initialize();
    await second.persistence.initialize();

    expect(first.persistence.getHistorySize()).toBe(2);
    expect(second.persistence.getHistorySize()).toBe(2);

    expect(first.persistence.getReportById("isolation-a")).not.toBeNull();
    expect(second.persistence.getReportById("isolation-b")).not.toBeNull();

    await first.persistence.clearHistory();
    await first.persistence.flush();

    expect(first.persistence.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);

    // Pastrimi i instancës së parë nuk duhet të ndryshojë
    // automatikisht gjendjen në memorien e instancës së dytë.
    expect(second.persistence.getHistorySize()).toBe(2);
    expect(second.persistence.getReportById("isolation-a")).not.toBeNull();
    expect(second.persistence.getReportById("isolation-b")).not.toBeNull();
  });

  it("rikthen vetëm të dhënat që gjenden në storage gjatë inicializimit", async () => {
    const storage = createStorage([
      createReport("persisted-report"),
    ]);

    const { persistence } = createPersistence(storage);

    await persistence.initialize();

    expect(persistence.getHistorySize()).toBe(1);
    expect(persistence.getReportById("persisted-report")).not.toBeNull();

    const restored = createPersistence(storage);

    await restored.persistence.initialize();

    expect(restored.persistence.getHistorySize()).toBe(1);
    expect(
      restored.persistence.getReportById("persisted-report"),
    ).not.toBeNull();

    expect(
      restored.persistence.getReportById("missing-report"),
    ).toBeNull();
  });

  it("ruan izolimin pas pastrimit dhe rikthimit", async () => {
    const storage = createStorage([
      createReport("old-report"),
    ]);

    const original = createPersistence(storage);

    await original.persistence.initialize();
    await original.persistence.clearHistory();
    await original.persistence.flush();

    expect(storage.getSnapshot()).toEqual([]);

    const restored = createPersistence(storage);

    await restored.persistence.initialize();

    expect(restored.persistence.getHistorySize()).toBe(0);
    expect(restored.persistence.listReports()).toEqual([]);
    expect(
      restored.persistence.getReportById("old-report"),
    ).toBeNull();
  });

  it("ruan raportet e reja pa rikthyer raportet e fshira", async () => {
    const storage = createStorage([
      createReport("old-report"),
    ]);

    const { persistence } = createPersistence(storage);

    await persistence.initialize();
    await persistence.clearHistory();
    await persistence.flush();

    await persistence.addReport(
      createReport("new-report", {
        summary: { score: 97 },
      }),
    );

    await persistence.flush();

    const restored = createPersistence(storage);

    await restored.persistence.initialize();

    expect(restored.persistence.getHistorySize()).toBe(1);
    expect(
      restored.persistence.getReportById("old-report"),
    ).toBeNull();

    expect(
      restored.persistence.getReportById("new-report").report.summary.score,
    ).toBe(97);
  });
});
