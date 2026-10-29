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
timestamp: overrides.timestamp ?? 1_800_000_000_000,
report: {
summary: {
title: "Consistency Failure Recovery",
score: 90,
...(overrides.summary ?? {}),
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
let failNextSave = false;
let failNextLoad = false;

return {
async loadHistory() {
if (failNextLoad) {
failNextLoad = false;
throw new Error("Temporary load failure");
}

  return structuredClone(history);
},

async saveHistory(nextHistory) {
  if (failNextSave) {
    failNextSave = false;
    throw new Error("Temporary save failure");
  }

  history = structuredClone(nextHistory);
},

failNextSave() {
  failNextSave = true;
},

failNextLoad() {
  failNextLoad = true;
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
return engine
.listReports()
.map((report) => report.id);
}

describe(
"Response Quality Benchmark History — Clear and Restore Data Consistency Under Failure",
() => {
it(
"ruan konsistencën pas dështimit të ruajtjes dhe pastrimit të historikut",
async () => {
const storage = createStorage();
const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    storage.failNextSave();

    await expect(
      persistence.addReport(createReport("failed-save-report")),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    storage.failNextSave();

    await expect(
      persistence.clearHistory(),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);
  },
);

it(
  "nuk rikthen raporte të vjetra pas rikuperimit të pastrimit",
  async () => {
    const storage = createStorage([
      createReport("stale-report"),
    ]);

    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    expect(getReportIds(engine)).toEqual([
      "stale-report",
    ]);

    storage.failNextSave();

    await expect(
      persistence.clearHistory(),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(1);

    await persistence.clearHistory();
    await persistence.flush();

    expect(engine.getHistorySize()).toBe(0);
    expect(storage.getSnapshot()).toHaveLength(0);

    const recovered = createPersistence(storage);

    await recovered.persistence.initialize();

    expect(recovered.engine.getHistorySize()).toBe(0);
    expect(getReportIds(recovered.engine)).toEqual([]);
    expect(storage.getSnapshot()).toHaveLength(0);
  },
);

it(
  "ruan raportet e reja pas rikuperimit nga dështimi i ruajtjes",
  async () => {
    const storage = createStorage();
    const { engine, persistence } = createPersistence(storage);

    await persistence.initialize();

    storage.failNextSave();

    await expect(
      persistence.addReport(
        createReport("report-before-recovery"),
      ),
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_PERSISTENCE_ERROR",
    });

    await persistence.addReport(
      createReport("report-after-recovery", {
        timestamp: 1_800_000_001_000,
      }),
    );

    await persistence.flush();

    expect(getReportIds(engine)).toContain(
      "report-after-recovery",
    );

    expect(
      storage
        .getSnapshot()
        .map((report) => report.id),
    ).toContain("report-after-recovery");
  },
);

it(
  "lejon inicializimin përsëri pas një dështimi të përkohshëm të leximit",
  async () => {
    const storage = createStorage([
      createReport("restored-report"),
    ]);

    const { engine, persistence } = createPersistence(storage);

    storage.failNextLoad();

    await expect(
      persistence.initialize(),
    ).rejects.toMatchObject({
      message: "Inicializimi i historikut benchmark dështoi.",
    });

    expect(engine.getHistorySize()).toBe(0);

    await persistence.initialize();

    expect(getReportIds(engine)).toEqual([
      "restored-report",
    ]);

    expect(storage.getSnapshot()).toHaveLength(1);
  },
);

},
);
