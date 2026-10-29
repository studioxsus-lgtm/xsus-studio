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
title: "Benchmark ${id}",
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
"Response Quality Benchmark History — Clear and Restore Ordering Integrity",
() => {
it(
"ruan rendin e saktë pas shtimit, pastrimit dhe shtimit të ri",
async () => {
const storage = createStorage();
const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("report-before-clear", 100),
    );

    await persistence.flush();

    await persistence.clearHistory();

    await persistence.addReport(
      createReport("report-after-clear", 200),
    );

    await persistence.flush();

    expect(getReportIds(engine)).toEqual([
      "report-after-clear",
    ]);

    expect(getStoredReportIds(storage)).toEqual([
      "report-after-clear",
    ]);
  },
);

it(
  "ruan gjendjen përfundimtare pas disa operacioneve të njëpasnjëshme",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("report-a", 100),
    );

    await persistence.addReport(
      createReport("report-b", 200),
    );

    await persistence.flush();

    await persistence.clearHistory();

    await persistence.addReport(
      createReport("report-c", 300),
    );

    await persistence.addReport(
      createReport("report-d", 400),
    );

    await persistence.flush();

    expect(getReportIds(engine)).toEqual([
      "report-d",
      "report-c",
    ]);

    expect(getStoredReportIds(storage)).toEqual([
      "report-c",
      "report-d",
    ]);
  },
);

it(
  "rikthen vetëm raportet përfundimtare pas inicializimit të ri",
  async () => {
    const storage = createStorage();
    const first = createPersistence(storage);

    await first.persistence.initialize();

    await first.persistence.addReport(
      createReport("obsolete-report", 100),
    );

    await first.persistence.flush();

    await first.persistence.clearHistory();

    await first.persistence.addReport(
      createReport("current-report", 200),
    );

    await first.persistence.flush();

    const second = createPersistence(storage);

    await second.persistence.initialize();

    expect(getReportIds(second.engine)).toEqual([
      "current-report",
    ]);

    expect(second.engine.getHistorySize()).toBe(1);

    expect(getStoredReportIds(storage)).toEqual([
      "current-report",
    ]);
  },
);

it(
  "nuk rikthen raporte të fshira pas pastrimit dhe flush-it të përsëritur",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("report-to-delete", 100),
    );

    await persistence.addReport(
      createReport("report-to-keep", 200),
    );

    await persistence.flush();

    await persistence.clearHistory();
    await persistence.flush();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(getReportIds(engine)).toEqual([]);
    expect(getStoredReportIds(storage)).toEqual([]);

    const restored = createPersistence(storage);

    await restored.persistence.initialize();

    expect(restored.engine.getHistorySize()).toBe(0);
    expect(getReportIds(restored.engine)).toEqual([]);
  },
);

},
);
