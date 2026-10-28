import { describe, it, expect, vi } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

/**

* Krijon një raport testimi me ID dinamike.
  */
  function createReport(index) {
  return {
  summary: {
  total: 1,
  passed: 1,
  failed: 0,
  score: index,
  },
  results: [
  {
  id: "case-" + index,
  status: "passed",
  },
  ],
  };
  }

/**

* Krijon një hyrje historiku me ID unike.
  */
  function createEntry(index, timestamp = index * 100) {
  return {
  id: "benchmark-" + index,
  timestamp,
  report: createReport(index),
  };
  }

/**

* Simulon storage JSON me kopje të pavarura të të dhënave.
  */
  function createStorage(initialHistory = []) {
  let persistedHistory = structuredClone(initialHistory);

return {
loadHistory: vi.fn(async () => {
return structuredClone(persistedHistory);
}),

saveHistory: vi.fn(async (history) => {
  persistedHistory = structuredClone(history);
}),

getPersistedHistory() {
  return structuredClone(persistedHistory);
},

};
}

/**

* Krijon engine-in, storage-in dhe persistence-in.
  */
  function createHarness({
  maxEntries = 100,
  initialHistory = [],
  } = {}) {
  const engine = createResponseQualityBenchmarkHistoryEngine({
  maxEntries,
  });

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

/**

* Krijon një instancë dhe inicializon historikun.
  */
  async function createInitializedHarness(options = {}) {
  const harness = createHarness(options);

await harness.persistence.initialize();

return harness;
}

function getEngineIds(engine) {
return engine.listReports().map((entry) => entry.id);
}

function getPersistedIds(storage) {
return storage.getPersistedHistory().map((entry) => entry.id);
}

describe("XSUS AI Core — Benchmark History Deletion Integrity", () => {
it("fshin një raport dhe e ruan fshirjen në storage", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

await persistence.addReport(createEntry(1));
await persistence.addReport(createEntry(2));
await persistence.addReport(createEntry(3));

const removed = await persistence.removeReport("benchmark-2");

await persistence.flush();

expect(removed).toBe(true);

expect(getEngineIds(engine)).toEqual([
  "benchmark-3",
  "benchmark-1",
]);

expect(getPersistedIds(storage)).toEqual([
  "benchmark-1",
  "benchmark-3",
]);

expect(persistence.getReportById("benchmark-2")).toBeNull();

});

it("përballon fshirjen e disa raporteve njëri pas tjetrit", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

for (let index = 1; index <= 5; index += 1) {
  await persistence.addReport(createEntry(index));
}

expect(persistence.getHistorySize()).toBe(5);

expect(
  await persistence.removeReport("benchmark-2"),
).toBe(true);

expect(
  await persistence.removeReport("benchmark-4"),
).toBe(true);

expect(
  await persistence.removeReport("benchmark-1"),
).toBe(true);

await persistence.flush();

expect(persistence.getHistorySize()).toBe(2);

expect(getEngineIds(engine)).toEqual([
  "benchmark-5",
  "benchmark-3",
]);

expect(getPersistedIds(storage)).toEqual([
  "benchmark-3",
  "benchmark-5",
]);

expect(persistence.getReportById("benchmark-1")).toBeNull();
expect(persistence.getReportById("benchmark-2")).toBeNull();
expect(persistence.getReportById("benchmark-4")).toBeNull();

});

it("pastron historikun bosh pas fshirjes dhe rikuperimit", async () => {
const first = await createInitializedHarness();

await first.persistence.addReport(createEntry(1));
await first.persistence.addReport(createEntry(2));
await first.persistence.addReport(createEntry(3));

await first.persistence.clearHistory();
await first.persistence.flush();

expect(first.persistence.getHistorySize()).toBe(0);
expect(first.engine.listReports()).toEqual([]);
expect(first.storage.getPersistedHistory()).toEqual([]);

const secondEngine =
  createResponseQualityBenchmarkHistoryEngine();

const secondPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: secondEngine,
    storage: first.storage,
  });

await secondPersistence.initialize();

expect(secondPersistence.getHistorySize()).toBe(0);
expect(secondPersistence.listReports()).toEqual([]);
expect(first.storage.loadHistory).toHaveBeenCalled();

});

it("ruan ciklin shtim → fshirje → rikuperim", async () => {
const first = await createInitializedHarness();

await first.persistence.addReport(createEntry(1));
await first.persistence.addReport(createEntry(2));
await first.persistence.addReport(createEntry(3));

expect(
  await first.persistence.removeReport("benchmark-2"),
).toBe(true);

await first.persistence.flush();

const persistedBeforeRecovery =
  first.storage.getPersistedHistory();

const recoveredEngine =
  createResponseQualityBenchmarkHistoryEngine();

const recoveredPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: recoveredEngine,
    storage: first.storage,
  });

await recoveredPersistence.initialize();

expect(recoveredPersistence.getHistorySize()).toBe(2);

expect(getEngineIds(recoveredEngine)).toEqual([
  "benchmark-3",
  "benchmark-1",
]);

expect(
  recoveredPersistence.getReportById("benchmark-2"),
).toBeNull();

expect(
  recoveredPersistence.getReportById("benchmark-1"),
).toEqual(
  expect.objectContaining({
    id: "benchmark-1",
    timestamp: 100,
  }),
);

expect(
  recoveredPersistence.getReportById("benchmark-3"),
).toEqual(
  expect.objectContaining({
    id: "benchmark-3",
    timestamp: 300,
  }),
);

expect(
  persistedBeforeRecovery.map((entry) => entry.id),
).toEqual([
  "benchmark-1",
  "benchmark-3",
]);

});

it("ruan konsistencën mes RAM-it dhe storage pas disa operacioneve", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

await persistence.addReport(createEntry(1));
await persistence.addReport(createEntry(2));
await persistence.addReport(createEntry(3));
await persistence.addReport(createEntry(4));

await persistence.removeReport("benchmark-2");

await persistence.addReport(createEntry(5));

await persistence.flush();

const memoryIds = getEngineIds(engine).sort();
const persistedIds = getPersistedIds(storage).sort();

expect(memoryIds).toEqual([
  "benchmark-1",
  "benchmark-3",
  "benchmark-4",
  "benchmark-5",
]);

expect(persistedIds).toEqual(memoryIds);

await persistence.clearHistory();
await persistence.flush();

expect(engine.listReports()).toEqual([]);
expect(storage.getPersistedHistory()).toEqual([]);
expect(persistence.getHistorySize()).toBe(0);

});

it("nuk ndryshon historikun kur kërkohet fshirja e një ID-je që mungon", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

await persistence.addReport(createEntry(1));
await persistence.addReport(createEntry(2));

const historyBefore = getEngineIds(engine);
const savedHistoryBefore = getPersistedIds(storage);
const saveCallsBefore = storage.saveHistory.mock.calls.length;

const removed =
  await persistence.removeReport("benchmark-missing");

await persistence.flush();

expect(removed).toBe(false);
expect(getEngineIds(engine)).toEqual(historyBefore);
expect(getPersistedIds(storage)).toEqual(savedHistoryBefore);

expect(storage.saveHistory).toHaveBeenCalledTimes(
  saveCallsBefore,
);

});
});
