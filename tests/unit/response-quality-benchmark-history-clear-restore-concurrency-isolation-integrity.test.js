import { describe, it, expect } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createReport(id, timestamp = 1_800_000_000_000) {
return {
id,
timestamp,
report: {
summary: {
title: "Isolation Benchmark ${id}",
score: 90,
},
results: [
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

function createPersistence(storage) {
const engine = createResponseQualityBenchmarkHistoryEngine();

const persistence =
createResponseQualityBenchmarkHistoryPersistence({
engine,
storage,
});

return {
engine,
persistence,
};
}

function getReportIds(engine) {
return engine.listReports().map((report) => report.id);
}

function getStoredReportIds(storage) {
return storage.getSnapshot().map((report) => report.id);
}

describe(
"Response Quality Benchmark History — Clear and Restore Concurrency Isolation Integrity",
() => {
it(
"izolon historikun e dy motorëve me storage të pavarur",
async () => {
const storageA = createStorage();
const storageB = createStorage();

    const instanceA = createPersistence(storageA);
    const instanceB = createPersistence(storageB);

    await Promise.all([
      instanceA.persistence.initialize(),
      instanceB.persistence.initialize(),
    ]);

    await Promise.all([
      instanceA.persistence.addReport(
        createReport("instance-a-report", 100),
      ),
      instanceB.persistence.addReport(
        createReport("instance-b-report", 200),
      ),
    ]);

    await Promise.all([
      instanceA.persistence.flush(),
      instanceB.persistence.flush(),
    ]);

    expect(getReportIds(instanceA.engine)).toEqual([
      "instance-a-report",
    ]);

    expect(getReportIds(instanceB.engine)).toEqual([
      "instance-b-report",
    ]);

    expect(getStoredReportIds(storageA)).toEqual([
      "instance-a-report",
    ]);

    expect(getStoredReportIds(storageB)).toEqual([
      "instance-b-report",
    ]);
  },
);

it(
  "parandalon ndikimin e pastrimit të një instance te tjetra",
  async () => {
    const storageA = createStorage();
    const storageB = createStorage();

    const instanceA = createPersistence(storageA);
    const instanceB = createPersistence(storageB);

    await Promise.all([
      instanceA.persistence.initialize(),
      instanceB.persistence.initialize(),
    ]);

    await Promise.all([
      instanceA.persistence.addReport(
        createReport("protected-a", 100),
      ),
      instanceB.persistence.addReport(
        createReport("protected-b", 200),
      ),
    ]);

    await Promise.all([
      instanceA.persistence.flush(),
      instanceB.persistence.flush(),
    ]);

    await instanceA.persistence.clearHistory();
    await instanceA.persistence.flush();

    expect(instanceA.engine.getHistorySize()).toBe(0);
    expect(getStoredReportIds(storageA)).toEqual([]);

    expect(getReportIds(instanceB.engine)).toEqual([
      "protected-b",
    ]);

    expect(getStoredReportIds(storageB)).toEqual([
      "protected-b",
    ]);
  },
);

it(
  "ruan izolimin gjatë pastrimeve dhe shtimeve të ndërthurura",
  async () => {
    const storageA = createStorage();
    const storageB = createStorage();

    const instanceA = createPersistence(storageA);
    const instanceB = createPersistence(storageB);

    await Promise.all([
      instanceA.persistence.initialize(),
      instanceB.persistence.initialize(),
    ]);

    await Promise.all([
      instanceA.persistence.addReport(
        createReport("a-initial", 100),
      ),
      instanceB.persistence.addReport(
        createReport("b-initial", 200),
      ),
    ]);

    await Promise.all([
      instanceA.persistence.flush(),
      instanceB.persistence.flush(),
    ]);

    await Promise.all([
      instanceA.persistence.clearHistory(),
      instanceB.persistence.addReport(
        createReport("b-follow-up", 300),
      ),
    ]);

    await Promise.all([
      instanceA.persistence.flush(),
      instanceB.persistence.flush(),
    ]);

    expect(getReportIds(instanceA.engine)).toEqual([]);
    expect(getStoredReportIds(storageA)).toEqual([]);

    expect(getReportIds(instanceB.engine)).toEqual([
      "b-follow-up",
      "b-initial",
    ]);

    expect(getStoredReportIds(storageB)).toHaveLength(2);

    expect(getStoredReportIds(storageB)).toEqual(
      expect.arrayContaining([
        "b-initial",
        "b-follow-up",
      ]),
    );
  },
);

it(
  "rikthen secilën instancë nga storage përkatës pa përzier raportet",
  async () => {
    const storageA = createStorage();
    const storageB = createStorage();

    const firstA = createPersistence(storageA);
    const firstB = createPersistence(storageB);

    await Promise.all([
      firstA.persistence.initialize(),
      firstB.persistence.initialize(),
    ]);

    await Promise.all([
      firstA.persistence.addReport(
        createReport("restore-a", 100),
      ),
      firstB.persistence.addReport(
        createReport("restore-b", 200),
      ),
    ]);

    await Promise.all([
      firstA.persistence.flush(),
      firstB.persistence.flush(),
    ]);

    const restoredA = createPersistence(storageA);
    const restoredB = createPersistence(storageB);

    await Promise.all([
      restoredA.persistence.initialize(),
      restoredB.persistence.initialize(),
    ]);

    expect(getReportIds(restoredA.engine)).toEqual([
      "restore-a",
    ]);

    expect(getReportIds(restoredB.engine)).toEqual([
      "restore-b",
    ]);

    expect(restoredA.engine.getHistorySize()).toBe(1);
    expect(restoredB.engine.getHistorySize()).toBe(1);

    expect(getStoredReportIds(storageA)).toEqual([
      "restore-a",
    ]);

    expect(getStoredReportIds(storageB)).toEqual([
      "restore-b",
    ]);
  },
);

},
);
