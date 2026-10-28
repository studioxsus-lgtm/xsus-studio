/**
 * XSUS AI Core — Benchmark History Concurrency & Transaction Safety Tests
 * Version: 1.0.0
 *
 * Faza 11.13:
 * - Shtime të njëkohshme.
 * - Serializimi i ruajtjeve.
 * - Vazhdimësia e radhës pas dështimit.
 * - Shtimi dhe fshirja e ndërthurur.
 * - Integriteti i historikut pas operacioneve të njëpasnjëshme.
 */

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

// --------------------------------------------------
// Fixtures
// --------------------------------------------------

function createReport(score = 90) {
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

function createHarness(storageOverrides = {}) {
  const engine =
    createResponseQualityBenchmarkHistoryEngine();

  const storage = {
    loadHistory: vi.fn().mockResolvedValue([]),
    saveHistory: vi.fn().mockResolvedValue(undefined),
    ...storageOverrides,
  };

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

// --------------------------------------------------
// Faza 11.13 — Concurrency & Transaction Safety
// --------------------------------------------------

describe("XSUS Benchmark History Concurrency & Transaction Safety", () => {
  it("ruan të dy raportet kur shtohen njëkohësisht", async () => {
    const {
      persistence,
      storage,
    } = createHarness();

    await persistence.initialize();

    const [first, second] = await Promise.all([
      persistence.addReport({
        id: "concurrent-1",
        report: createReport(91),
        timestamp: 100,
      }),
      persistence.addReport({
        id: "concurrent-2",
        report: createReport(92),
        timestamp: 200,
      }),
    ]);

    expect(first.id).toBe("concurrent-1");
    expect(second.id).toBe("concurrent-2");

    expect(persistence.getHistorySize()).toBe(2);

    expect(
      persistence.getReportById("concurrent-1")
    ).not.toBeNull();

    expect(
      persistence.getReportById("concurrent-2")
    ).not.toBeNull();

    await persistence.flush();

    const lastSavedHistory =
      storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(
      lastSavedHistory.map((entry) => entry.id).sort()
    ).toEqual(["concurrent-1", "concurrent-2"]);
  });

  it("serializon ruajtjet gjatë shtimeve të njëkohshme", async () => {
    const {
      persistence,
      storage,
    } = createHarness({
      saveHistory: vi.fn(),
    });

    let activeWrites = 0;
    let maximumConcurrentWrites = 0;

    storage.saveHistory.mockImplementation(async () => {
      activeWrites += 1;

      maximumConcurrentWrites = Math.max(
        maximumConcurrentWrites,
        activeWrites
      );

      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      activeWrites -= 1;
    });

    await persistence.initialize();

    await Promise.all([
      persistence.addReport({
        id: "serialized-1",
        report: createReport(81),
        timestamp: 100,
      }),
      persistence.addReport({
        id: "serialized-2",
        report: createReport(82),
        timestamp: 200,
      }),
      persistence.addReport({
        id: "serialized-3",
        report: createReport(83),
        timestamp: 300,
      }),
    ]);

    await persistence.flush();

    expect(maximumConcurrentWrites).toBe(1);
    expect(storage.saveHistory).toHaveBeenCalledTimes(3);
    expect(persistence.getHistorySize()).toBe(3);
  });

  it("lejon që radha e ruajtjes të vazhdojë pas një dështimi", async () => {
    const {
      persistence,
      storage,
    } = createHarness({
      saveHistory: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Gabim i simuluar i diskut.")
        )
        .mockResolvedValue(undefined),
    });

    await persistence.initialize();

    await expect(
      persistence.addReport({
        id: "retry-1",
        report: createReport(71),
        timestamp: 100,
      })
    ).rejects.toThrow(
      "Sinkronizimi i historikut benchmark me diskun dështoi."
    );

    expect(persistence.getHistorySize()).toBe(1);

    await expect(
      persistence.addReport({
        id: "retry-2",
        report: createReport(72),
        timestamp: 200,
      })
    ).resolves.toMatchObject({
      id: "retry-2",
    });

    await persistence.flush();

    expect(storage.saveHistory).toHaveBeenCalledTimes(2);

    const lastSavedHistory =
      storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(
      lastSavedHistory.map((entry) => entry.id).sort()
    ).toEqual(["retry-1", "retry-2"]);

    expect(persistence.getHistorySize()).toBe(2);
  });

  it("ruan gjendjen përfundimtare kur shtimi dhe fshirja ndërthuren", async () => {
    const {
      persistence,
      storage,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "interleave-1",
      report: createReport(81),
      timestamp: 100,
    });

    await persistence.addReport({
      id: "interleave-2",
      report: createReport(82),
      timestamp: 200,
    });

    const [added, removed] = await Promise.all([
      persistence.addReport({
        id: "interleave-3",
        report: createReport(83),
        timestamp: 300,
      }),
      persistence.removeReport("interleave-1"),
    ]);

    expect(added.id).toBe("interleave-3");
    expect(removed).toBe(true);
    expect(persistence.getHistorySize()).toBe(2);

    expect(
      persistence.getReportById("interleave-1")
    ).toBeNull();

    expect(
      persistence.getReportById("interleave-2")
    ).not.toBeNull();

    expect(
      persistence.getReportById("interleave-3")
    ).not.toBeNull();

    await persistence.flush();

    const savedHistory =
      storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(
      savedHistory.map((entry) => entry.id).sort()
    ).toEqual(["interleave-2", "interleave-3"]);
  });

  it("ruan historikun e saktë pas shtimeve dhe fshirjeve të njëpasnjëshme", async () => {
    const {
      persistence,
      storage,
    } = createHarness();

    await persistence.initialize();

    await Promise.all([
      persistence.addReport({
        id: "sequence-1",
        report: createReport(71),
        timestamp: 100,
      }),
      persistence.addReport({
        id: "sequence-2",
        report: createReport(72),
        timestamp: 200,
      }),
    ]);

    await persistence.removeReport("sequence-1");

    await persistence.addReport({
      id: "sequence-3",
      report: createReport(73),
      timestamp: 300,
    });

    await persistence.flush();

    expect(persistence.getHistorySize()).toBe(2);

    expect(
      persistence.getReportById("sequence-1")
    ).toBeNull();

    const savedHistory =
      storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(
      savedHistory.map((entry) => entry.id).sort()
    ).toEqual(["sequence-2", "sequence-3"]);
  });
});
