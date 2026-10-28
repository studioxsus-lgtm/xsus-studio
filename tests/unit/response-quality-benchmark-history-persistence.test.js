
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryStorage,
} from "../../src/core/response-quality-benchmark-history-storage.js";

import {
  RESPONSE_QUALITY_BENCHMARK_HISTORY_PERSISTENCE_VERSION,
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

describe("XSUS Benchmark History Persistence Integration", () => {
  let directory;
  let filePath;
  let engine;
  let storage;
  let persistence;

  function createReport(score = 80) {
    return {
      summary: {
        score,
      },
      results: [
        {
          metric: "quality",
          value: score,
        },
      ],
    };
  }

  function createEntry(id, score, timestamp) {
    return {
      id,
      report: createReport(score),
      timestamp,
    };
  }

  async function createPersistence() {
    engine = createResponseQualityBenchmarkHistoryEngine();
    storage = createResponseQualityBenchmarkHistoryStorage({
      filePath,
    });

    persistence = createResponseQualityBenchmarkHistoryPersistence({
      engine,
      storage,
    });

    await persistence.initialize();
  }

  beforeEach(async () => {
    directory = await mkdtemp(
      path.join(tmpdir(), "xsus-benchmark-history-")
    );

    filePath = path.join(directory, "history.json");
  });

  afterEach(async () => {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  });

  it("ekspozon version e saktë", () => {
    expect(
      RESPONSE_QUALITY_BENCHMARK_HISTORY_PERSISTENCE_VERSION
    ).toBe("1.0.0");
  });

  it("inicializohet me histori bosh kur skedari mungon", async () => {
    await createPersistence();

    expect(persistence.getHistorySize()).toBe(0);
    expect(persistence.getMetadata().initialized).toBe(true);
  });

  it("ruan raportin e ri në disk", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 91, 1000)
    );

    const restored = await storage.loadHistory();

    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe("report-1");
    expect(restored[0].report.summary.score).toBe(91);
  });

  it("rikthen historikun pas krijimit të një engine të ri", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 75, 1000)
    );
    await persistence.addReport(
      createEntry("report-2", 95, 2000)
    );
    await persistence.flush();

    const restoredEngine =
      createResponseQualityBenchmarkHistoryEngine();

    const restoredPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: restoredEngine,
        storage: createResponseQualityBenchmarkHistoryStorage({
          filePath,
        }),
      });

    await restoredPersistence.initialize();

    expect(restoredPersistence.getHistorySize()).toBe(2);
    expect(
      restoredPersistence.getReportById("report-1")
        .report.summary.score
    ).toBe(75);
    expect(
      restoredPersistence.getReportById("report-2")
        .report.summary.score
    ).toBe(95);
  });

  it("ruan rendin e futjes gjatë rikthimit", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 70, 3000)
    );
    await persistence.addReport(
      createEntry("report-2", 80, 1000)
    );
    await persistence.addReport(
      createEntry("report-3", 90, 2000)
    );
    await persistence.flush();

    const nextEngine =
      createResponseQualityBenchmarkHistoryEngine();

    const nextPersistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine: nextEngine,
        storage: createResponseQualityBenchmarkHistoryStorage({
          filePath,
        }),
      });

    await nextPersistence.initialize();

    const bySequence = nextPersistence
      .listReports()
      .slice()
      .sort((a, b) => a.sequence - b.sequence);

    expect(bySequence.map((entry) => entry.id)).toEqual([
      "report-1",
      "report-2",
      "report-3",
    ]);
  });

  it("sinkronizon fshirjen me diskun", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 85, 1000)
    );
    await persistence.addReport(
      createEntry("report-2", 90, 2000)
    );

    expect(await persistence.removeReport("report-1")).toBe(true);

    const saved = await storage.loadHistory();

    expect(saved.map((entry) => entry.id)).toEqual([
      "report-2",
    ]);
  });

  it("sinkronizon pastrimin e historikut me diskun", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 85, 1000)
    );

    await persistence.clearHistory();

    expect(persistence.getHistorySize()).toBe(0);
    expect(await storage.loadHistory()).toEqual([]);
  });

  it("nuk e fshin raportin kur ID-ja nuk ekziston", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 85, 1000)
    );

    expect(await persistence.removeReport("missing")).toBe(false);
    expect(persistence.getHistorySize()).toBe(1);
    expect(await storage.loadHistory()).toHaveLength(1);
  });

  it("nuk lejon inicializim të përsëritur të historikut", async () => {
    await createPersistence();

    await persistence.addReport(
      createEntry("report-1", 85, 1000)
    );

    const metadata = await persistence.initialize();

    expect(metadata.historySize).toBe(1);
    expect(persistence.getHistorySize()).toBe(1);
  });

  it("nuk lejon operacione para inicializimit", async () => {
    engine = createResponseQualityBenchmarkHistoryEngine();
    storage = createResponseQualityBenchmarkHistoryStorage({
      filePath,
    });

    persistence = createResponseQualityBenchmarkHistoryPersistence({
      engine,
      storage,
    });

    expect(() => persistence.getHistorySize()).toThrow(
      "Inicializo historikun benchmark përpara se ta përdorësh."
    );

    await expect(
      persistence.addReport(createEntry("report-1", 85, 1000))
    ).rejects.toThrow(
      "Inicializo historikun benchmark përpara se ta përdorësh."
    );
  });

  it("refuzon inicializimin mbi engine jo bosh", async () => {
    engine = createResponseQualityBenchmarkHistoryEngine();
    storage = createResponseQualityBenchmarkHistoryStorage({
      filePath,
    });

    engine.addReport(createEntry("existing", 80, 1000));

    persistence = createResponseQualityBenchmarkHistoryPersistence({
      engine,
      storage,
    });

    await expect(persistence.initialize()).rejects.toThrow(
      "Inicializimi i historikut benchmark dështoi."
    );
  });
});
