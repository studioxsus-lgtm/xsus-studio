import { describe, it, expect, vi } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index) {
return {
id: "lifecycle-" + index,
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
id: "lifecycle-case-" + index,
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

describe("XSUS AI Core — Benchmark History Lifecycle Integrity", () => {
it("inicializon historikun bosh pa krijuar raporte", async () => {
const { engine, persistence } = createHarness();

await persistence.initialize();

expect(persistence.getHistorySize()).toBe(0);
expect(persistence.listReports()).toEqual([]);
expect(engine.listReports()).toEqual([]);

});

it("ruan raportet e shtuara gjatë ciklit të jetës", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createEntry(1));
await persistence.addReport(createEntry(2));

await persistence.flush();

expect(persistence.getHistorySize()).toBe(2);

expect(
  engine.listReports().map((entry) => entry.id).sort(),
).toEqual(["lifecycle-1", "lifecycle-2"]);

expect(
  storage.getPersistedHistory().map((entry) => entry.id).sort(),
).toEqual(["lifecycle-1", "lifecycle-2"]);

});

it("rikthen historikun pas krijimit të një instance të re", async () => {
const storage = createStorage();
const firstEngine = createResponseQualityBenchmarkHistoryEngine();

const firstPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: firstEngine,
    storage,
  });

await firstPersistence.initialize();

await firstPersistence.addReport(createEntry(1));
await firstPersistence.addReport(createEntry(2));
await firstPersistence.flush();

// Krijojmë një motor dhe persistence të ri,
// duke përdorur të njëjtin storage të qëndrueshëm.
const secondEngine = createResponseQualityBenchmarkHistoryEngine();

const secondPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: secondEngine,
    storage,
  });

await secondPersistence.initialize();

expect(secondPersistence.getHistorySize()).toBe(2);

expect(
  secondEngine.listReports().map((entry) => entry.id).sort(),
).toEqual(["lifecycle-1", "lifecycle-2"]);

});

it("ruan integritetin e raporteve pas disa cikleve të ruajtjes dhe leximit", async () => {
const storage = createStorage();

const first = createHarness();
// Përdorim të njëjtin storage në të gjitha ciklet.
const firstPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: first.engine,
    storage,
  });

await firstPersistence.initialize();

await firstPersistence.addReport(createEntry(1));
await firstPersistence.flush();

const secondEngine = createResponseQualityBenchmarkHistoryEngine();

const secondPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: secondEngine,
    storage,
  });

await secondPersistence.initialize();

await secondPersistence.addReport(createEntry(2));
await secondPersistence.flush();

const thirdEngine = createResponseQualityBenchmarkHistoryEngine();

const thirdPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: thirdEngine,
    storage,
  });

await thirdPersistence.initialize();

expect(thirdPersistence.getHistorySize()).toBe(2);

const reports = thirdPersistence.listReports();

expect(
  reports.map((entry) => entry.id).sort(),
).toEqual(["lifecycle-1", "lifecycle-2"]);

expect(
  new Set(reports.map((entry) => entry.id)).size,
).toBe(2);

expect(
  storage.getPersistedHistory().map((entry) => entry.id).sort(),
).toEqual(["lifecycle-1", "lifecycle-2"]);

});
});
