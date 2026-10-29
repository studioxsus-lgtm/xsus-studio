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

function createHarness(initialHistory = []) {
const engine =
createResponseQualityBenchmarkHistoryEngine();

const storage = createStorage(initialHistory);

const persistence =
createResponseQualityBenchmarkHistoryPersistence({
engine,
storage,
});

return {
engine,
storage,
persistence,
};
}

function getReportIds(entries) {
return entries.map((entry) => entry.id).sort();
}

describe("Response Quality Benchmark History — Deduplication Integrity", () => {
it("refuzon shtimin e një identifikuesi që ekziston", async () => {
const { engine, persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createReport("report-1"));

await expect(
  persistence.addReport(
    createReport("report-1", {
      summary: { score: 10 },
    }),
  ),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(engine.getHistorySize()).toBe(1);

});

it("ruan raportin origjinal pas refuzimit të dublikatës", async () => {
const { persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(
  createReport("report-1", {
    summary: {
      score: 95,
      title: "Original",
    },
  }),
);

await expect(
  persistence.addReport(
    createReport("report-1", {
      summary: {
        score: 5,
        title: "Duplicate",
      },
    }),
  ),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(
  persistence.getReportById("report-1"),
).toMatchObject({
  id: "report-1",
  report: {
    summary: {
      score: 95,
      title: "Original",
    },
  },
});

expect(persistence.getHistorySize()).toBe(1);

});

it("nuk ndryshon hyrjet ekzistuese kur refuzohet një dublikatë", async () => {
const { persistence } = createHarness();

await persistence.initialize();

await persistence.addReport(createReport("report-1"));
await persistence.addReport(createReport("report-2"));

const before = persistence.listReports();

await expect(
  persistence.addReport(createReport("report-1")),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(persistence.listReports()).toEqual(before);
expect(persistence.getHistorySize()).toBe(2);

});

it("ruan identifikuesit unikë në storage pas shtimit", async () => {
const { persistence, storage } = createHarness();

await persistence.initialize();

await persistence.addReport(createReport("report-1"));
await persistence.addReport(createReport("report-2"));
await persistence.addReport(createReport("report-3"));

await expect(
  persistence.addReport(createReport("report-2")),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-2.",
);

await persistence.flush();

const persistedEntries = storage.getSnapshot();

expect(getReportIds(persistedEntries)).toEqual([
  "report-1",
  "report-2",
  "report-3",
]);

expect(persistedEntries).toHaveLength(3);

});

it("rikthen historikun dhe refuzon identifikuesit e përsëritur", async () => {
const first = createHarness();

await first.persistence.initialize();

await first.persistence.addReport(createReport("report-1"));
await first.persistence.addReport(createReport("report-2"));

await first.persistence.flush();

const savedHistory = first.storage.getSnapshot();

const restored = createHarness(savedHistory);

await restored.persistence.initialize();

expect(restored.persistence.getHistorySize()).toBe(2);

expect(
  getReportIds(restored.persistence.listReports()),
).toEqual(["report-1", "report-2"]);

await expect(
  restored.persistence.addReport(createReport("report-1")),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(restored.persistence.getHistorySize()).toBe(2);

});

it("mban engine-in dhe storage-in konsistent pas refuzimit të dublikatës", async () => {
const { engine, persistence, storage } = createHarness();

await persistence.initialize();

await persistence.addReport(
  createReport("report-1", {
    summary: { score: 88 },
  }),
);

await persistence.addReport(
  createReport("report-2", {
    summary: { score: 96 },
  }),
);

await persistence.flush();

const persistedBefore = storage.getSnapshot();

await expect(
  persistence.addReport(createReport("report-1")),
).rejects.toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

await persistence.flush();

const persistedAfter = storage.getSnapshot();

expect(persistedAfter).toEqual(persistedBefore);
expect(engine.getHistorySize()).toBe(2);

expect(
  getReportIds(persistence.listReports()),
).toEqual(getReportIds(persistedAfter));

});
});
