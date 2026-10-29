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

function getReportIds(reports) {
return reports.map((entry) => entry.id).sort();
}

describe("Response Quality Benchmark History — Deduplication Integrity", () => {
it("refuzon shtimin e një identifikuesi që ekziston", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

engine.addReport(createReport("report-1"));

expect(() => {
  engine.addReport(
    createReport("report-1", {
      summary: { score: 10 },
    }),
  );
}).toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(engine.getHistorySize()).toBe(1);

});

it("ruan raportin origjinal pas refuzimit të dublikatës", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

engine.addReport(
  createReport("report-1", {
    summary: { score: 95, title: "Original" },
  }),
);

expect(() => {
  engine.addReport(
    createReport("report-1", {
      summary: { score: 5, title: "Duplicate" },
    }),
  );
}).toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(engine.getReportById("report-1")).toMatchObject({
  id: "report-1",
  report: {
    summary: {
      score: 95,
      title: "Original",
    },
  },
});

expect(engine.getHistorySize()).toBe(1);

});

it("nuk ndryshon hyrjet ekzistuese kur refuzohet një dublikatë", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

engine.addReport(createReport("report-1"));
engine.addReport(createReport("report-2"));

const before = engine.listReports();

expect(() => {
  engine.addReport(createReport("report-1"));
}).toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(engine.listReports()).toEqual(before);
expect(engine.getHistorySize()).toBe(2);

});

it("ruan identifikuesit unikë pas flush", async () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

const storage = createStorage();

const persistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

await persistence.initialize();

engine.addReport(createReport("report-1"));
engine.addReport(createReport("report-2"));
engine.addReport(createReport("report-3"));

expect(() => {
  engine.addReport(createReport("report-2"));
}).toThrow(
  "Raporti ekziston tashmë në historik: report-2.",
);

await persistence.flush();

const persistedReports = storage.getSnapshot();

expect(getReportIds(persistedReports)).toEqual([
  "report-1",
  "report-2",
  "report-3",
]);

expect(persistedReports).toHaveLength(3);

});

it("ruan integritetin e historikut pas rikthimit", async () => {
const firstEngine =
createResponseQualityBenchmarkHistoryEngine();

const firstStorage = createStorage();

const firstPersistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine: firstEngine,
    storage: firstStorage,
  });

await firstPersistence.initialize();

firstEngine.addReport(createReport("report-1"));
firstEngine.addReport(createReport("report-2"));

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

expect(restoredEngine.getHistorySize()).toBe(2);

expect(
  getReportIds(restoredEngine.listReports()),
).toEqual(["report-1", "report-2"]);

expect(() => {
  restoredEngine.addReport(createReport("report-1"));
}).toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

expect(restoredEngine.getHistorySize()).toBe(2);

});

it("mban storage-in dhe engine-in konsistent pas refuzimit të dublikatës", async () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

const storage = createStorage();

const persistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

await persistence.initialize();

engine.addReport(createReport("report-1"));
engine.addReport(createReport("report-2"));

await persistence.flush();

const persistedBefore = storage.getSnapshot();

expect(() => {
  engine.addReport(createReport("report-1"));
}).toThrow(
  "Raporti ekziston tashmë në historik: report-1.",
);

await persistence.flush();

const persistedAfter = storage.getSnapshot();

expect(persistedAfter).toEqual(persistedBefore);
expect(engine.getHistorySize()).toBe(2);

expect(getReportIds(engine.listReports())).toEqual(
  getReportIds(persistedAfter),
);

});
});
