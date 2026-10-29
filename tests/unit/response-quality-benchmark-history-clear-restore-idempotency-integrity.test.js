import { describe, it, expect } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createReport(id, timestamp = 1_800_000_000_000) {
return {
id,
timestamp,
report: {
summary: {
title: "Benchmark ${id}",
score: 90,
},
results: [
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

const persistence =
createResponseQualityBenchmarkHistoryPersistence({
engine,
storage,
});

return {
engine,
persistence,
};
}

function getReportIds(engine) {
return engine.listReports().map((report) => report.id);
}

function getStoredReportIds(storage) {
return storage.getSnapshot().map((report) => report.id);
}

describe(
"Response Quality Benchmark History — Clear and Restore Idempotency Integrity",
() => {
it(
"ruan historikun bosh pas pastrimeve të përsëritura",
async () => {
const storage = createStorage([
createReport("report-a"),
createReport("report-b", 1_800_000_001_000),
]);

    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    expect(engine.getHistorySize()).toBe(2);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);
  },
);

it(
  "nuk krijon raporte të dyfishta pas flush-it të përsëritur",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("unique-report"),
    );

    await persistence.flush();
    await persistence.flush();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(1);
    expect(getReportIds(engine)).toEqual([
      "unique-report",
    ]);

    expect(storage.getSnapshot()).toHaveLength(1);
    expect(getStoredReportIds(storage)).toEqual([
      "unique-report",
    ]);
  },
);

it(
  "ruan vetëm një kopje të çdo raporti pas rikthimit në një motor të ri",
  async () => {
    const storage = createStorage();
    const first = createPersistence(storage);

    await first.persistence.initialize();

    await first.persistence.addReport(
      createReport("report-a", 1_800_000_000_000),
    );

    await first.persistence.addReport(
      createReport("report-b", 1_800_000_001_000),
    );

    await first.persistence.flush();
    await first.persistence.flush();

    const second = createPersistence(storage);

    await second.persistence.initialize();

    expect(second.engine.getHistorySize()).toBe(2);

    expect(getReportIds(second.engine)).toEqual([
      "report-b",
      "report-a",
    ]);

    expect(getStoredReportIds(storage)).toEqual([
      "report-a",
      "report-b",
    ]);

    expect(
      new Set(getReportIds(second.engine)).size,
    ).toBe(2);
  },
);

it(
  "ruan integritetin gjatë cikleve të përsëritura të pastrimit dhe rikthimit",
  async () => {
    const storage = createStorage();
    const first = createPersistence(storage);

    await first.persistence.initialize();

    await first.persistence.addReport(
      createReport("initial-report"),
    );

    await first.persistence.flush();

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await first.persistence.clearHistory();
      await first.persistence.flush();

      expect(first.engine.getHistorySize()).toBe(0);
      expect(storage.getSnapshot()).toHaveLength(0);

      await first.persistence.addReport(
        createReport(
          `cycle-report-${cycle}`,
          1_800_000_000_000 + cycle * 1_000,
        ),
      );

      await first.persistence.flush();

      expect(first.engine.getHistorySize()).toBe(1);

      expect(getReportIds(first.engine)).toEqual([
        `cycle-report-${cycle}`,
      ]);

      expect(getStoredReportIds(storage)).toEqual([
        `cycle-report-${cycle}`,
      ]);

      const restored = createPersistence(storage);

      await restored.persistence.initialize();

      expect(restored.engine.getHistorySize()).toBe(1);

      expect(getReportIds(restored.engine)).toEqual([
        `cycle-report-${cycle}`,
      ]);
    }
  },
);

},
);
