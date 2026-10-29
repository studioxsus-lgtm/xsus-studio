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
score: 90,
metadata: {
source: "deduplication-integrity-test",
},
...overrides,
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
const storage = createStorage(initialHistory);

const engine = createResponseQualityBenchmarkHistoryEngine();

const persistence = createResponseQualityBenchmarkHistoryPersistence({
engine,
storage,
});

return {
engine,
persistence,
storage,
};
}

async function createInitializedHarness(initialHistory = []) {
const harness = createHarness(initialHistory);

await harness.persistence.initialize();

return harness;
}

function getReportIds(reports) {
return reports.map((report) => report.id).sort();
}

describe("Response Quality Benchmark History — Deduplication Integrity", () => {
it("refuzon shtimin e një raporti me identifikues ekzistues", async () => {
const { engine } = await createInitializedHarness();

await engine.addReport(createReport("report-1"));

await expect(
  engine.addReport(
    createReport("report-1", {
      score: 10,
      metadata: {
        source: "duplicate",
      },
    }),
  ),
).rejects.toThrow(
  new TypeError("Raporti ekziston tashmë në historik"),
);

expect(engine.getHistorySize()).toBe(1);

});

it("ruan raportin origjinal kur shtimi i dublikatës refuzohet", async () => {
const { engine } = await createInitializedHarness();

const originalReport = createReport("report-1", {
  score: 95,
  metadata: {
    source: "original",
  },
});

await engine.addReport(originalReport);

try {
  await engine.addReport(
    createReport("report-1", {
      score: 5,
      metadata: {
        source: "duplicate",
      },
    }),
  );
} catch {
  // Refuzimi i dublikatës pritet nga kontrata e engine-it.
}

expect(engine.getReportById("report-1")).toMatchObject({
  id: "report-1",
  score: 95,
  metadata: {
    source: "original",
  },
});

expect(engine.getHistorySize()).toBe(1);

});

it("nuk ndryshon raportet ekzistuese kur refuzohet një dublikatë", async () => {
const { engine } = await createInitializedHarness();

await engine.addReport(createReport("report-1", { score: 81 }));
await engine.addReport(createReport("report-2", { score: 92 }));

const before = engine.listReports();

await expect(
  engine.addReport(createReport("report-1", { score: 1 })),
).rejects.toThrow(
  new TypeError("Raporti ekziston tashmë në historik"),
);

expect(engine.listReports()).toEqual(before);
expect(engine.getHistorySize()).toBe(2);

});

it("ruan identifikuesit unikë pas flush", async () => {
const { engine, persistence, storage } =
await createInitializedHarness();

await engine.addReport(createReport("report-1"));
await engine.addReport(createReport("report-2"));
await engine.addReport(createReport("report-3"));

await expect(
  engine.addReport(createReport("report-2", { score: 0 })),
).rejects.toThrow(
  new TypeError("Raporti ekziston tashmë në historik"),
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

it("ruan integritetin e historikut pas rikthimit nga storage", async () => {
const firstHarness = await createInitializedHarness();

await firstHarness.engine.addReport(createReport("report-1"));
await firstHarness.engine.addReport(createReport("report-2"));
await firstHarness.persistence.flush();

const savedHistory = firstHarness.storage.getSnapshot();

const secondHarness = await createInitializedHarness(savedHistory);

const restoredReports = secondHarness.engine.listReports();

expect(restoredReports).toHaveLength(2);
expect(getReportIds(restoredReports)).toEqual([
  "report-1",
  "report-2",
]);

await expect(
  secondHarness.engine.addReport(createReport("report-1")),
).rejects.toThrow(
  new TypeError("Raporti ekziston tashmë në historik"),
);

expect(secondHarness.engine.getHistorySize()).toBe(2);

});

it("mban storage-in dhe engine-in konsistent pas refuzimit të dublikatës", async () => {
const { engine, persistence, storage } =
await createInitializedHarness();

await engine.addReport(createReport("report-1", { score: 88 }));
await engine.addReport(createReport("report-2", { score: 96 }));
await persistence.flush();

const persistedBefore = storage.getSnapshot();

await expect(
  engine.addReport(createReport("report-1", { score: 0 })),
).rejects.toThrow(
  new TypeError("Raporti ekziston tashmë në historik"),
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
