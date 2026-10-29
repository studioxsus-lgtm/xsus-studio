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
title: "Shared Storage Benchmark ${id}",
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

function createSharedStorage(initialHistory = []) {
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
"Response Quality Benchmark History — Shared-Storage Concurrency Integrity",
() => {
it(
"rikthen të njëjtin snapshot nga dy instanca pas inicializimit",
async () => {
const storage = createSharedStorage([
createReport("shared-a", 100),
createReport("shared-b", 200),
]);

    const instanceA = createPersistence(storage);
    const instanceB = createPersistence(storage);

    await Promise.all([
      instanceA.persistence.initialize(),
      instanceB.persistence.initialize(),
    ]);

    expect(getReportIds(instanceA.engine)).toEqual([
      "shared-b",
      "shared-a",
    ]);

    expect(getReportIds(instanceB.engine)).toEqual([
      "shared-b",
      "shared-a",
    ]);

    expect(instanceA.engine.getHistorySize()).toBe(2);
    expect(instanceB.engine.getHistorySize()).toBe(2);
  },
);

it(
  "ruan dhe rikthen një shkrim të përfunduar në storage të përbashkët",
  async () => {
    const storage = createSharedStorage();

    const writer = createPersistence(storage);

    await writer.persistence.initialize();

    await writer.persistence.addReport(
      createReport("shared-written-report", 100),
    );

    await writer.persistence.flush();

    const reader = createPersistence(storage);

    await reader.persistence.initialize();

    expect(getStoredReportIds(storage)).toEqual([
      "shared-written-report",
    ]);

    expect(getReportIds(reader.engine)).toEqual([
      "shared-written-report",
    ]);
  },
);

it(
  "pasqyron pastrimin e përfunduar për instancat e inicializuara më pas",
  async () => {
    const storage = createSharedStorage([
      createReport("obsolete-a", 100),
      createReport("obsolete-b", 200),
    ]);

    const writer = createPersistence(storage);

    await writer.persistence.initialize();

    await writer.persistence.clearHistory();
    await writer.persistence.flush();

    expect(storage.getSnapshot()).toEqual([]);

    const reader = createPersistence(storage);

    await reader.persistence.initialize();

    expect(reader.engine.getHistorySize()).toBe(0);
    expect(getReportIds(reader.engine)).toEqual([]);
  },
);

it(
  "ruan një gjendje përfundimtare të vlefshme pas shkrimeve të njëpasnjëshme nga dy instanca",
  async () => {
    const storage = createSharedStorage();

    const instanceA = createPersistence(storage);
    const instanceB = createPersistence(storage);

    await Promise.all([
      instanceA.persistence.initialize(),
      instanceB.persistence.initialize(),
    ]);

    await instanceA.persistence.addReport(
      createReport("writer-a-report", 100),
    );

    await instanceA.persistence.flush();

    await instanceB.persistence.addReport(
      createReport("writer-b-report", 200),
    );

    await instanceB.persistence.flush();

    const snapshot = storage.getSnapshot();

    expect(Array.isArray(snapshot)).toBe(true);

    expect(
      snapshot.every(
        (entry) =>
          typeof entry.id === "string" &&
          typeof entry.timestamp === "number" &&
          entry.report !== null &&
          typeof entry.report === "object",
      ),
    ).toBe(true);

    expect(
      new Set(snapshot.map((entry) => entry.id)).size,
    ).toBe(snapshot.length);

    const restored = createPersistence(storage);

    await restored.persistence.initialize();

    expect(getReportIds(restored.engine)).toEqual(
      snapshot
        .slice()
        .sort(
          (a, b) =>
            b.timestamp - a.timestamp ||
            (b.sequence ?? 0) - (a.sequence ?? 0),
        )
        .map((entry) => entry.id),
    );
  },
);

},
);
