import { describe, it, expect } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

/**

* Krijon një raport testimi me të dhëna të pavarura.
  */
  function createReport(id, overrides = {}) {
  return {
  id,
  timestamp: 1_800_000_000_000,
  report: {
  summary: {
  title: "Benchmark ${id}",
  score: 90,
  ...overrides.summary,
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

/**

* Storage testues që izolon të dhënat përmes kopjeve të thella.
  */
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
"Response Quality Benchmark History — Data Immutability Integrity",
() => {
it("kthen hyrje të ngrira dhe të pandryshueshme", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

  engine.addReport(createReport("report-1"));

  const entry = engine.getReportById("report-1");

  expect(Object.isFrozen(entry)).toBe(true);
  expect(Object.isFrozen(entry.report)).toBe(true);
  expect(Object.isFrozen(entry.report.summary)).toBe(true);
  expect(Object.isFrozen(entry.report.results)).toBe(true);
  expect(Object.isFrozen(entry.report.results[0])).toBe(true);
});

it("nuk lejon modifikimin e fushave të hyrjes së kthyer", () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  engine.addReport(createReport("report-1"));

  const entry = engine.getReportById("report-1");

  expect(() => {
    entry.report.summary.score = 1;
  }).toThrow(TypeError);

  expect(
    engine.getReportById("report-1").report.summary.score,
  ).toBe(90);
});

it("nuk lejon ndryshimin e array-t results", () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  engine.addReport(createReport("report-1"));

  const entry = engine.getReportById("report-1");

  expect(() => {
    entry.report.results.push({
      name: "injected-result",
      score: 0,
      passed: false,
    });
  }).toThrow(TypeError);

  expect(
    engine.getReportById("report-1").report.results,
  ).toHaveLength(1);
});

it("izolon engine-in nga ndryshimet në hyrjen origjinale", () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  const input = createReport("report-1");

  engine.addReport(input);

  input.report.summary.score = 1;
  input.report.summary.title = "Modified externally";
  input.report.results[0].score = 0;

  input.report.results.push({
    name: "external-result",
    score: 0,
    passed: false,
  });

  const saved = engine.getReportById("report-1");

  expect(saved.report.summary.score).toBe(90);
  expect(saved.report.summary.title).toBe("Benchmark report-1");
  expect(saved.report.results).toHaveLength(1);
  expect(saved.report.results[0].score).toBe(90);
});

it("ruan pandryshueshmërinë e snapshot-eve të listës", () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  engine.addReport(createReport("report-1"));
  engine.addReport(createReport("report-2"));

  const snapshot = engine.listReports();

  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot[0])).toBe(true);
  expect(
    Object.isFrozen(snapshot[0].report.summary),
  ).toBe(true);

  expect(() => {
    snapshot[0].report.summary.score = 0;
  }).toThrow(TypeError);

  expect(engine.getHistorySize()).toBe(2);

  expect(
    engine.getReportById(snapshot[0].id).report.summary.score,
  ).toBe(90);
});

it("ruan snapshot-et e mëparshme pas shtimeve të reja", () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  engine.addReport(createReport("report-1"));

  const oldSnapshot = engine.listReports();

  engine.addReport(createReport("report-2"));

  const newSnapshot = engine.listReports();

  expect(oldSnapshot).toHaveLength(1);
  expect(newSnapshot).toHaveLength(2);

  expect(oldSnapshot[0].id).toBe("report-1");
  expect(oldSnapshot[0].report.summary.score).toBe(90);
});

it("izolon storage-in nga ndryshimet e hyrjeve të kthyera", async () => {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  const storage = createStorage();

  const persistence =
    createResponseQualityBenchmarkHistoryPersistence({
      engine,
      storage,
    });

  await persistence.initialize();
  await persistence.addReport(createReport("report-1"));

  const storedBefore = storage.getSnapshot();

  const returnedEntry =
    persistence.getReportById("report-1");

  expect(() => {
    returnedEntry.report.summary.score = 0;
  }).toThrow(TypeError);

  expect(storage.getSnapshot()).toEqual(storedBefore);

  expect(
    persistence.getReportById("report-1").report.summary.score,
  ).toBe(90);
});

it("ruan integritetin pas persistimit dhe rikthimit", async () => {
  const firstEngine =
    createResponseQualityBenchmarkHistoryEngine();

  const firstStorage = createStorage();

  const firstPersistence =
    createResponseQualityBenchmarkHistoryPersistence({
      engine: firstEngine,
      storage: firstStorage,
    });

  await firstPersistence.initialize();

  await firstPersistence.addReport(createReport("report-1"));

  await firstPersistence.addReport(
    createReport("report-2", {
      summary: {
        title: "Benchmark report-2",
        score: 85,
      },
    }),
  );

  await firstPersistence.flush();

  const savedHistory = firstStorage.getSnapshot();

  const restoredEngine =
    createResponseQualityBenchmarkHistoryEngine();

  const restoredStorage = createStorage(savedHistory);

  const restoredPersistence =
    createResponseQualityBenchmarkHistoryPersistence({
      engine: restoredEngine,
      storage: restoredStorage,
    });

  await restoredPersistence.initialize();

  const restoredEntry =
    restoredPersistence.getReportById("report-1");

  expect(Object.isFrozen(restoredEntry)).toBe(true);
  expect(Object.isFrozen(restoredEntry.report)).toBe(true);

  expect(
    Object.isFrozen(restoredEntry.report.summary),
  ).toBe(true);

  expect(
    Object.isFrozen(restoredEntry.report.results),
  ).toBe(true);

  expect(restoredEntry.report.summary.title).toBe(
    "Benchmark report-1",
  );

  expect(restoredEntry.report.summary.score).toBe(90);
  expect(restoredPersistence.getHistorySize()).toBe(2);
});

},
);
