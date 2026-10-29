import { describe, it, expect, vi } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index) {
return {
id: "benchmark-" + index,
timestamp: index * 100,
report: {
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

function createHarness({
initialHistory = [],
} = {}) {
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

async function createInitializedHarness(options = {}) {
const harness = createHarness(options);

await harness.persistence.initialize();

return harness;
}

describe("XSUS AI Core — Benchmark History Failure Recovery", () => {
it("ruan raportin në RAM kur ruajtja në storage dështon", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

storage.saveHistory.mockRejectedValueOnce(
  new Error("Storage unavailable"),
);

await expect(
  persistence.addReport(createEntry(1)),
).rejects.toThrow();

expect(persistence.getHistorySize()).toBe(1);

expect(
  persistence.getReportById("benchmark-1"),
).not.toBeNull();

expect(
  engine.listReports().map((entry) => entry.id),
).toEqual(["benchmark-1"]);

expect(storage.getPersistedHistory()).toEqual([]);

});

it("rikthen ruajtjen pas një dështimi të përkohshëm", async () => {
const { engine, storage, persistence } =
await createInitializedHarness();

storage.saveHistory.mockRejectedValueOnce(
  new Error("Temporary storage failure"),
);

await expect(
  persistence.addReport(createEntry(1)),
).rejects.toThrow();

expect(persistence.getHistorySize()).toBe(1);

storage.saveHistory.mockImplementation(async (history) => {
  storage._persistedHistory = structuredClone(history);
});

// Ruajtja e dytë duhet të përfshijë historikun aktual në RAM.
storage.saveHistory.mockImplementationOnce(async (history) => {
  storage._persistedHistory = structuredClone(history);
});

// Shto një raport tjetër për të provuar ruajtjen pas rikthimit.
await persistence.addReport(createEntry(2));
await persistence.flush();

expect(persistence.getHistorySize()).toBe(2);

expect(
  engine.listReports().map((entry) => entry.id),
).toEqual(["benchmark-2", "benchmark-1"]);

expect(storage.saveHistory).toHaveBeenCalledTimes(2);

});

it("nuk inicializon historikun kur leximi nga storage dështon", async () => {
const { engine, storage, persistence } = createHarness();

storage.loadHistory.mockRejectedValueOnce(
  new Error("Storage read failure"),
);

await expect(
  persistence.initialize(),
).rejects.toThrow();

expect(engine.listReports()).toEqual([]);
expect(persistence.getHistorySize()).toBe(0);

});

it("rikuperon historikun pas një dështimi të leximit", async () => {
const initialHistory = [
createEntry(1),
createEntry(2),
];

const { engine, storage, persistence } = createHarness({
  initialHistory,
});

storage.loadHistory.mockRejectedValueOnce(
  new Error("Temporary read failure"),
);

await expect(
  persistence.initialize(),
).rejects.toThrow();

expect(engine.listReports()).toEqual([]);

await persistence.initialize();

expect(persistence.getHistorySize()).toBe(2);

expect(
  engine.listReports().map((entry) => entry.id),
).toEqual(["benchmark-2", "benchmark-1"]);

});
});
