import { describe, it, expect } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createEntry(index, overrides = {}) {
return {
id: "boundary-" + index,
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
id: "boundary-case-" + index,
status: "passed",
},
],
},
...overrides,
};
}

function createStorage(initialHistory = []) {
let persistedHistory = structuredClone(initialHistory);

return {
async loadHistory() {
return structuredClone(persistedHistory);
},

async saveHistory(history) {
  persistedHistory = structuredClone(history);
},

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

describe("XSUS AI Core — Benchmark History Boundary Integrity", () => {
it("inicializon dhe ruan një historik bosh", async () => {
const { engine, storage, persistence } = createHarness();

await persistence.initialize();
await persistence.flush();

expect(persistence.getHistorySize()).toBe(0);
expect(persistence.listReports()).toEqual([]);
expect(engine.listReports()).toEqual([]);
expect(storage.getPersistedHistory()).toEqual([]);

});

it("ruan dhe rikthen një raport të vetëm", async () => {
const { storage, persistence } = createHarness();

await persistence.initialize();
await persistence.addReport(createEntry(1));
await persistence.flush();

const restoredEngine = createResponseQualityBenchmarkHistoryEngine();

const restoredPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: restoredEngine,
    storage,
  });

await restoredPersistence.initialize();

expect(restoredPersistence.getHistorySize()).toBe(1);
expect(restoredPersistence.getReportById("boundary-1")).not.toBeNull();

expect(
  restoredEngine.listReports().map((entry) => entry.id),
).toEqual(["boundary-1"]);

});

it("ruan tekst të gjatë pa ndryshuar përmbajtjen", async () => {
const { storage, persistence } = createHarness();

await persistence.initialize();

const longText = "XSUS-AI-".repeat(1000);

const entry = createEntry(2, {
  report: {
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      score: 2,
    },
    results: [
      {
        id: "boundary-case-2",
        status: "passed",
        details: longText,
      },
    ],
  },
});

await persistence.addReport(entry);
await persistence.flush();

const savedEntry = storage
  .getPersistedHistory()
  .find((item) => item.id === "boundary-2");

expect(savedEntry).toBeDefined();

expect(
  savedEntry.report.results[0].details,
).toBe(longText);

});

it("ruan identifikues me karaktere të ndryshme", async () => {
const { storage, persistence } = createHarness();

await persistence.initialize();

const identifiers = [
  "boundary-simple",
  "boundary_with_underscore",
  "boundary.with.dot",
  "boundary-123",
];

for (const [index, id] of identifiers.entries()) {
  await persistence.addReport({
    ...createEntry(index + 1),
    id,
  });
}

await persistence.flush();

const savedIds = storage
  .getPersistedHistory()
  .map((entry) => entry.id);

for (const id of identifiers) {
  expect(savedIds).toContain(id);
}

expect(new Set(savedIds).size).toBe(identifiers.length);

});

it("ruan vlerat numerike në kufijtë zero dhe negativë", async () => {
const { storage, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport({
  ...createEntry(3),
  timestamp: 0,
  report: {
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      score: 0,
    },
    results: [],
  },
});

await persistence.addReport({
  ...createEntry(4),
  timestamp: -100,
  report: {
    summary: {
      total: 1,
      passed: 0,
      failed: 1,
      score: -1,
    },
    results: [
      {
        id: "boundary-case-4",
        status: "failed",
      },
    ],
  },
});

await persistence.flush();

const savedHistory = storage.getPersistedHistory();

const zeroEntry = savedHistory.find(
  (entry) => entry.id === "boundary-3",
);

const negativeEntry = savedHistory.find(
  (entry) => entry.id === "boundary-4",
);

expect(zeroEntry.timestamp).toBe(0);
expect(zeroEntry.report.summary.score).toBe(0);

expect(negativeEntry.timestamp).toBe(-100);
expect(negativeEntry.report.summary.score).toBe(-1);

});
});
