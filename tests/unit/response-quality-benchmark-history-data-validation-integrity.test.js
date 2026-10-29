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
},
results: [
{
name: "response-quality",
score: 90,
passed: true,
},
],
...overrides,
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

function getReportIds(entries) {
return entries.map((entry) => entry.id).sort();
}

describe("Response Quality Benchmark History — Data Validation Integrity", () => {
it("refuzon një hyrje që nuk është objekt i thjeshtë", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

expect(() => engine.addReport(null)).toThrow(
  "entry duhet të jetë objekt i thjeshtë.",
);

expect(() => engine.addReport([])).toThrow(
  "entry duhet të jetë objekt i thjeshtë.",
);

expect(engine.getHistorySize()).toBe(0);

});

it("refuzon identifikuesit bosh ose jo tekst", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

for (const id of ["", "   ", null, 123]) {
  expect(() => {
    engine.addReport(createReport(id));
  }).toThrow("id duhet të jetë tekst jo bosh.");
}

expect(engine.getHistorySize()).toBe(0);

});

it("refuzon timestamp-et e pavlefshme", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

for (const timestamp of [-1, NaN, Infinity, "1800000000000"]) {
  expect(() => {
    engine.addReport({
      ...createReport("report-invalid-timestamp"),
      timestamp,
    });
  }).toThrow(
    "timestamp duhet të jetë numër i vlefshëm jo negativ.",
  );
}

expect(engine.getHistorySize()).toBe(0);

});

it("refuzon raportet pa summary ose results të vlefshme", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

expect(() => {
  engine.addReport({
    id: "report-no-summary",
    report: {
      results: [],
    },
  });
}).toThrow(
  "report.summary duhet të jetë objekt i thjeshtë.",
);

expect(() => {
  engine.addReport({
    id: "report-no-results",
    report: {
      summary: {},
    },
  });
}).toThrow(
  "report.results duhet të jetë një array.",
);

expect(engine.getHistorySize()).toBe(0);

});

it("ruan historikun ekzistues pas refuzimit të një hyrjeje të pavlefshme", () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

engine.addReport(createReport("report-valid"));

const before = engine.listReports();

expect(() => {
  engine.addReport({
    id: "report-invalid",
    timestamp: -1,
    report: {
      summary: {},
      results: [],
    },
  });
}).toThrow(
  "timestamp duhet të jetë numër i vlefshëm jo negativ.",
);

expect(engine.listReports()).toEqual(before);
expect(engine.getHistorySize()).toBe(1);
expect(engine.getReportById("report-valid")).not.toBeNull();

});

it("nuk ruan hyrje të pavlefshme në storage", async () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

const storage = createStorage();

const persistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

await persistence.initialize();

await persistence.addReport(createReport("report-valid"));

const before = storage.getSnapshot();

await expect(
  persistence.addReport({
    id: "report-invalid",
    timestamp: -1,
    report: {
      summary: {},
      results: [],
    },
  }),
).rejects.toThrow(
  "timestamp duhet të jetë numër i vlefshëm jo negativ.",
);

await persistence.flush();

expect(storage.getSnapshot()).toEqual(before);
expect(persistence.getHistorySize()).toBe(1);

expect(
  getReportIds(persistence.listReports()),
).toEqual(["report-valid"]);

});

it("lejon shtime të vlefshme pas disa refuzimeve të validimit", async () => {
const engine =
createResponseQualityBenchmarkHistoryEngine();

const storage = createStorage();

const persistence =
  createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

await persistence.initialize();

await expect(
  persistence.addReport(null),
).rejects.toThrow(
  "entry duhet të jetë objekt i thjeshtë.",
);

await expect(
  persistence.addReport({
    id: "report-invalid",
    timestamp: -1,
    report: {
      summary: {},
      results: [],
    },
  }),
).rejects.toThrow(
  "timestamp duhet të jetë numër i vlefshëm jo negativ.",
);

await persistence.addReport(createReport("report-valid"));

expect(persistence.getHistorySize()).toBe(1);

expect(
  persistence.getReportById("report-valid"),
).not.toBeNull();

await persistence.flush();

expect(
  getReportIds(storage.getSnapshot()),
).toEqual(["report-valid"]);

});
});
