import { describe, it, expect, vi } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index) {
return {
id: "transaction-" + index,
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
id: "transaction-case-" + index,
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

describe("XSUS AI Core — Benchmark History Transaction Integrity", () => {
it("ruan raportet ekzistuese kur ruajtja e raportit të ri dështon", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createEntry(1));
await persistence.flush();

expect(
  storage.getPersistedHistory().map((entry) => entry.id),
).toEqual(["transaction-1"]);

storage.saveHistory.mockRejectedValueOnce(
  new Error("Transaction storage failure"),
);

await expect(
  persistence.addReport(createEntry(2)),
).rejects.toThrow();

// Raporti i mëparshëm duhet të mbetet në historikun e ruajtur.
expect(
  storage.getPersistedHistory().map((entry) => entry.id),
).toEqual(["transaction-1"]);

// Raporti i ri duhet të mbetet në RAM sipas sjelljes së persistence.
expect(persistence.getHistorySize()).toBe(2);

expect(
  engine.listReports().map((entry) => entry.id).sort(),
).toEqual(["transaction-1", "transaction-2"]);

});

it("ruan të gjithë historikun pas rikuperimit të ruajtjes", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

storage.saveHistory.mockRejectedValueOnce(
  new Error("Temporary transaction failure"),
);

await expect(
  persistence.addReport(createEntry(1)),
).rejects.toThrow();

expect(persistence.getHistorySize()).toBe(1);
expect(storage.getPersistedHistory()).toEqual([]);

// Operacioni tjetër duhet të ruajë historikun e plotë nga RAM.
await persistence.addReport(createEntry(2));
await persistence.flush();

expect(persistence.getHistorySize()).toBe(2);

expect(
  engine.listReports().map((entry) => entry.id).sort(),
).toEqual(["transaction-1", "transaction-2"]);

expect(
  storage.getPersistedHistory().map((entry) => entry.id).sort(),
).toEqual(["transaction-1", "transaction-2"]);

});

it("nuk krijon dublikime gjatë ruajtjeve të përsëritura", async () => {
const { storage, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createEntry(1));
await persistence.flush();
await persistence.flush();
await persistence.flush();

const persistedIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id);

expect(persistedIds).toEqual(["transaction-1"]);

expect(new Set(persistedIds).size).toBe(persistedIds.length);

});

it("ruan konsistencën pas disa operacioneve të suksesshme", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createEntry(1));
await persistence.addReport(createEntry(2));
await persistence.flush();

await persistence.addReport(createEntry(3));
await persistence.flush();

const engineIds = engine
  .listReports()
  .map((entry) => entry.id)
  .sort();

const storageIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id)
  .sort();

expect(engineIds).toEqual([
  "transaction-1",
  "transaction-2",
  "transaction-3",
]);

expect(storageIds).toEqual(engineIds);

expect(new Set(storageIds).size).toBe(storageIds.length);

});
});
