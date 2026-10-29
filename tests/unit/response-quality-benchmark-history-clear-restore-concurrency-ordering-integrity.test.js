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
title: "Concurrency Benchmark ${id}",
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
const saveSnapshots = [];

return {
async loadHistory() {
return structuredClone(history);
},

async saveHistory(nextHistory) {
  const snapshot = structuredClone(nextHistory);

  saveSnapshots.push(snapshot);
  history = snapshot;
},

getSnapshot() {
  return structuredClone(history);
},

getSaveSnapshots() {
  return structuredClone(saveSnapshots);
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
"Response Quality Benchmark History — Clear and Restore Concurrency Ordering Integrity",
() => {
it(
"ruan të gjitha raportet gjatë shtimeve të njëkohshme",
async () => {
const storage = createStorage();
const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await Promise.all([
      persistence.addReport(createReport("concurrent-a", 100)),
      persistence.addReport(createReport("concurrent-b", 200)),
      persistence.addReport(createReport("concurrent-c", 300)),
      persistence.addReport(createReport("concurrent-d", 400)),
    ]);

    await persistence.flush();

    expect(engine.getHistorySize()).toBe(4);

    expect(new Set(getReportIds(engine)).size).toBe(4);

    expect(getStoredReportIds(storage)).toHaveLength(4);

    expect(new Set(getStoredReportIds(storage)).size).toBe(4);

    expect(getStoredReportIds(storage)).toEqual(
      expect.arrayContaining([
        "concurrent-a",
        "concurrent-b",
        "concurrent-c",
        "concurrent-d",
      ]),
    );
  },
);

it(
  "ruan gjendjen bosh kur pastrimi kryhet pas shtimeve të përfunduara",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await Promise.all([
      persistence.addReport(createReport("before-clear-a", 100)),
      persistence.addReport(createReport("before-clear-b", 200)),
      persistence.addReport(createReport("before-clear-c", 300)),
    ]);

    await persistence.flush();

    expect(engine.getHistorySize()).toBe(3);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(getReportIds(engine)).toEqual([]);
    expect(storage.getSnapshot()).toEqual([]);
  },
);

it(
  "ruan rendin e shkrimeve dhe gjendjen përfundimtare pas pastrimit dhe shtimit të ri",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    await persistence.addReport(
      createReport("initial-report", 100),
    );

    await persistence.flush();

    await persistence.clearHistory();

    await persistence.addReport(
      createReport("final-report-a", 200),
    );

    await persistence.addReport(
      createReport("final-report-b", 300),
    );

    await persistence.flush();

    expect(engine.getHistorySize()).toBe(2);

    expect(getReportIds(engine)).toEqual([
      "final-report-b",
      "final-report-a",
    ]);

    expect(getStoredReportIds(storage)).toEqual(
      expect.arrayContaining([
        "final-report-a",
        "final-report-b",
      ]),
    );

    expect(getStoredReportIds(storage)).toHaveLength(2);

    const snapshots = storage.getSaveSnapshots();

    expect(snapshots.length).toBeGreaterThan(0);

    expect(snapshots[snapshots.length - 1]).toHaveLength(2);

    expect(
      snapshots[snapshots.length - 1].map(
        (report) => report.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        "final-report-a",
        "final-report-b",
      ]),
    );
  },
);

it(
  "rikthen gjendjen përfundimtare pas përfundimit të operacioneve të ruajtjes",
  async () => {
    const storage = createStorage();
    const first = createPersistence(storage);

    await first.persistence.initialize();

    await Promise.all([
      first.persistence.addReport(
        createReport("restore-a", 100),
      ),
      first.persistence.addReport(
        createReport("restore-b", 200),
      ),
      first.persistence.addReport(
        createReport("restore-c", 300),
      ),
    ]);

    await first.persistence.flush();

    await first.persistence.clearHistory();
    await first.persistence.flush();

    await first.persistence.addReport(
      createReport("restored-final", 400),
    );

    await first.persistence.flush();

    const second = createPersistence(storage);

    await second.persistence.initialize();

    expect(second.engine.getHistorySize()).toBe(1);

    expect(getReportIds(second.engine)).toEqual([
      "restored-final",
    ]);

    expect(getStoredReportIds(storage)).toEqual([
      "restored-final",
    ]);
  },
);

},
);
