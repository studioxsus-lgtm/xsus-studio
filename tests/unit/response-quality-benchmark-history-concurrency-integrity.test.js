import { describe, it, expect, vi } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index) {
return {
id: "concurrency-" + index,
timestamp: index * 100,
report: {
summary: {
total: 2,
passed: 2,
failed: 0,
score: index,
},
results: [
{
id: "concurrency-case-" + index,
status: "passed",
},
],
},
};
}

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

function createHarness() {
const engine = createResponseQualityBenchmarkHistoryEngine();
const storage = createStorage();

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

describe("XSUS AI Core — Benchmark History Concurrency Integrity", () => {
it("ruan të gjitha raportet kur shtohen paralelisht", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

const entries = Array.from(
  { length: 10 },
  (_, index) => createEntry(index + 1),
);

await Promise.all(
  entries.map((entry) => persistence.addReport(entry)),
);

await persistence.flush();

const expectedIds = entries
  .map((entry) => entry.id)
  .sort();

const engineIds = engine
  .listReports()
  .map((entry) => entry.id)
  .sort();

const storageIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id)
  .sort();

expect(engineIds).toEqual(expectedIds);
expect(storageIds).toEqual(expectedIds);
expect(new Set(storageIds).size).toBe(10);

});

it("ruan konsistencën gjatë thirrjeve paralele të flush", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

await Promise.all(
  Array.from(
    { length: 6 },
    (_, index) => persistence.addReport(createEntry(index + 1)),
  ),
);

await Promise.all([
  persistence.flush(),
  persistence.flush(),
  persistence.flush(),
  persistence.flush(),
]);

const engineIds = engine
  .listReports()
  .map((entry) => entry.id)
  .sort();

const storageIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id)
  .sort();

expect(engineIds).toEqual(storageIds);
expect(storageIds).toHaveLength(6);
expect(new Set(storageIds).size).toBe(6);

});

it("ruan historikun e plotë pas disa grupeve të shtimeve paralele", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

const firstBatch = Array.from(
  { length: 5 },
  (_, index) => createEntry(index + 1),
);

const secondBatch = Array.from(
  { length: 5 },
  (_, index) => createEntry(index + 6),
);

await Promise.all(
  firstBatch.map((entry) => persistence.addReport(entry)),
);

await persistence.flush();

await Promise.all(
  secondBatch.map((entry) => persistence.addReport(entry)),
);

await persistence.flush();

const expectedIds = Array.from(
  { length: 10 },
  (_, index) => "concurrency-" + (index + 1),
).sort();

const engineIds = engine
  .listReports()
  .map((entry) => entry.id)
  .sort();

const storageIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id)
  .sort();

expect(engineIds).toEqual(expectedIds);
expect(storageIds).toEqual(expectedIds);
expect(new Set(storageIds).size).toBe(10);

});

it("rikthen të njëjtin historik pas inicializimit të një instance të re", async () => {
const storage = createStorage();

const firstEngine = createResponseQualityBenchmarkHistoryEngine();

const firstPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: firstEngine,
    storage,
  });

await firstPersistence.initialize();

await Promise.all(
  Array.from(
    { length: 8 },
    (_, index) => firstPersistence.addReport(createEntry(index + 1)),
  ),
);

await firstPersistence.flush();

const secondEngine = createResponseQualityBenchmarkHistoryEngine();

const secondPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: secondEngine,
    storage,
  });

await secondPersistence.initialize();

const restoredIds = secondEngine
  .listReports()
  .map((entry) => entry.id)
  .sort();

const persistedIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id)
  .sort();

expect(restoredIds).toEqual(persistedIds);
expect(restoredIds).toHaveLength(8);
expect(new Set(restoredIds).size).toBe(8);

});
});
