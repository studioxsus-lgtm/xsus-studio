/**
 * XSUS AI Core — Benchmark History Persistence & Recovery Tests
 * Version: 1.2.1
 *
 * Përfshin:
 * - Faza 11.8: JSON Storage Recovery.
 * - Faza 11.9: Persistence Integration.
 * - Faza 11.10: Recovery Integration.
 * - Faza 11.11: Recovery Integrity & Consistency.
 * - Faza 11.12: History Lifecycle & Management.
 */

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryStorage,
} from "../../src/core/response-quality-benchmark-history-storage.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

import {
  RESPONSE_QUALITY_BENCHMARK_HISTORY_RECOVERY_VERSION,
  createResponseQualityBenchmarkHistoryRecovery,
} from "../../src/core/response-quality-benchmark-history-recovery.js";

// --------------------------------------------------
// Fixtures
// --------------------------------------------------

async function createTempDirectory() {
  return mkdtemp(join(tmpdir(), "xsus-history-recovery-"));
}

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

function createEntry(
  id = "run-1",
  timestamp = 100,
  sequence = 1
) {
  return {
    id,
    timestamp,
    sequence,
    report: {
      version: "1.0.0",
      summary: {
        benchmarkCount: 1,
        passedCount: 1,
      },
      results: [
        {
          id: "accuracy",
          status: "passed",
          actual: 0.99,
        },
      ],
    },
  };
}

function createDocument(entries = [createEntry()]) {
  return {
    format: "xsus-benchmark-history",
    formatVersion: 1,
    engineVersion: "1.0.0",
    savedAt: "2026-01-01T00:00:00.000Z",
    entries,
  };
}

function createHarness(storageOverrides = {}, maxRetries = 2) {
  const engine = createResponseQualityBenchmarkHistoryEngine();

  const storage = {
    loadHistory: vi.fn().mockResolvedValue([]),
    saveHistory: vi.fn().mockResolvedValue({
      version: "1.0.0",
      savedCount: 0,
    }),
    ...storageOverrides,
  };

  const persistence = createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

  const recovery = createResponseQualityBenchmarkHistoryRecovery({
    persistence,
    storage,
    maxRetries,
  });

  return {
    engine,
    storage,
    persistence,
    recovery,
  };
}

// --------------------------------------------------
// Faza 11.8 — Storage Persistence Recovery
// --------------------------------------------------

describe("XSUS Benchmark History Storage Recovery", () => {
  it("rikthen histori bosh kur skedari nuk ekziston", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "missing.json");

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.loadHistory()).resolves.toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuzon JSON të dëmtuar", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      await writeFile(filePath, '{"format": invalid', "utf8");

      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.loadHistory()).rejects.toThrow(
        "Skedari i historikut benchmark përmban JSON të pavlefshëm."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuzon versionin e formatit që nuk mbështetet", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      await writeFile(
        filePath,
        JSON.stringify({
          ...createDocument(),
          formatVersion: 999,
        }),
        "utf8"
      );

      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.loadHistory()).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuzon timestamp të pavlefshëm", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const invalidEntry = createEntry();
      invalidEntry.timestamp = -10;

      await writeFile(
        filePath,
        JSON.stringify(createDocument([invalidEntry])),
        "utf8"
      );

      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.loadHistory()).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuzon ID të përsëritura gjatë rikuperimit", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      await writeFile(
        filePath,
        JSON.stringify(
          createDocument([
            createEntry("duplicate", 100, 1),
            createEntry("duplicate", 200, 2),
          ])
        ),
        "utf8"
      );

      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.loadHistory()).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("ruan integritetin pas save dhe load", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      const history = [
        createEntry("run-1", 100, 1),
        createEntry("run-2", 200, 2),
        createEntry("run-3", 300, 3),
      ];

      await storage.saveHistory(history);

      const restored = await storage.loadHistory();

      expect(restored).toEqual(history);
      expect(restored).not.toBe(history);
      expect(restored[0]).not.toBe(history[0]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("refuzon ruajtjen kur history nuk është array", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(storage.saveHistory({})).rejects.toThrow(
        "history duhet të jetë një array."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("ruan skedarin ekzistues kur validimi dështon", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      await writeFile(
        filePath,
        JSON.stringify(createDocument()),
        "utf8"
      );

      const originalContents = await readFile(filePath, "utf8");

      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(
        storage.saveHistory([
          createEntry("duplicate", 100, 1),
          createEntry("duplicate", 200, 2),
        ])
      ).rejects.toThrow(
        "ID e përsëritur në history: duplicate."
      );

      expect(await readFile(filePath, "utf8")).toBe(originalContents);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("trajton gabimin e leximit kur rruga është direktori", async () => {
    const directory = await createTempDirectory();

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath: directory,
      });

      await expect(storage.loadHistory()).rejects.toThrow(
        "Leximi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("trajton gabimin e shkrimit kur drejtoria prind mungon", async () => {
    const directory = await createTempDirectory();

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath: join(directory, "missing-directory", "history.json"),
      });

      await expect(
        storage.saveHistory([createEntry()])
      ).rejects.toThrow(
        "Ruajtja e historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("nuk krijon skedar kur historiku ka ID të përsëritura", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage = createResponseQualityBenchmarkHistoryStorage({
        filePath,
      });

      await expect(
        storage.saveHistory([
          createEntry("same", 100, 1),
          createEntry("same", 200, 2),
        ])
      ).rejects.toThrow(
        "ID e përsëritur në history: same."
      );

      await expect(
        readFile(filePath, "utf8")
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------
// Faza 11.10 — Recovery Integration
// --------------------------------------------------

describe("XSUS Benchmark History Recovery Integration", () => {
  it("ekspozon versionin 1.0.0", () => {
    expect(RESPONSE_QUALITY_BENCHMARK_HISTORY_RECOVERY_VERSION).toBe(
      "1.0.0"
    );
  });

  it("shënon historikun si të sinkronizuar pas ruajtjes", async () => {
    const { recovery } = createHarness();

    const result = await recovery.recover();

    expect(result.status).toBe("synchronized");
    expect(result.synchronized).toBe(true);
    expect(result.lastSuccessfulSaveAt).toBeTruthy();
  });

  it("riprovon pas dështimit dhe rikuperohet", async () => {
    const saveHistory = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Disku përkohësisht i padisponueshëm")
      )
      .mockResolvedValueOnce({
        savedCount: 0,
      });

    const { recovery } = createHarness({ saveHistory }, 2);

    const result = await recovery.recover();

    expect(saveHistory).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("synchronized");
    expect(result.totalAttempts).toBe(2);
    expect(result.lastError).toBeNull();
  });

  it("raporton dështim kur shterohen riprovimet", async () => {
    const saveHistory = vi.fn().mockRejectedValue(
      new Error("Gabim i përhershëm i ruajtjes")
    );

    const { recovery } = createHarness({ saveHistory }, 2);

    await expect(
      recovery.recover()
    ).rejects.toMatchObject({
      code: "BENCHMARK_HISTORY_RECOVERY_FAILED",
      attempts: 3,
    });

    expect(saveHistory).toHaveBeenCalledTimes(3);
    expect(recovery.getStatus().status).toBe("failed");
    expect(recovery.getStatus().synchronized).toBe(false);
  });

  it("nuk e shënon gjendjen si të sinkronizuar kur ruajtja dështon", async () => {
    const saveHistory = vi.fn().mockRejectedValue(
      new Error("Shkrimi dështoi")
    );

    const { recovery } = createHarness({ saveHistory }, 0);

    await expect(
      recovery.recover()
    ).rejects.toThrow(
      "Rikuperimi i ruajtjes së historikut benchmark dështoi."
    );

    expect(recovery.getStatus()).toMatchObject({
      status: "failed",
      synchronized: false,
      totalAttempts: 1,
    });
  });

  it("ruan raportet aktuale të historikut", async () => {
    const {
      engine,
      storage,
      persistence,
      recovery,
    } = createHarness();

    await persistence.initialize();

    engine.addReport({
      id: "report-1",
      timestamp: 1000,
      report: createReport(85),
    });

    engine.addReport({
      id: "report-2",
      timestamp: 2000,
      report: createReport(95),
    });

    await recovery.recover();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(savedEntries).toBeDefined();

    expect(savedEntries.map((entry) => entry.id)).toEqual([
      "report-1",
      "report-2",
    ]);

    expect(savedEntries.map((entry) => entry.sequence)).toEqual([
      1,
      2,
    ]);
  });

  it("refuzon numrin negativ të riprovimeve", () => {
    const { persistence, storage } = createHarness();

    expect(() =>
      createResponseQualityBenchmarkHistoryRecovery({
        persistence,
        storage,
        maxRetries: -1,
      })
    ).toThrow(
      "Numri i riprovimeve duhet të jetë numër i plotë jo negativ."
    );
  });

  it("bashkon thirrjet paralele të rikuperimit", async () => {
    let resolveSave;

    const saveHistory = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );

    const { recovery } = createHarness({ saveHistory });

    const first = recovery.recover();
    const second = recovery.recover();

    await vi.waitFor(() => {
      expect(saveHistory).toHaveBeenCalledTimes(1);
    });

    resolveSave({ savedCount: 0 });

    const [firstResult, secondResult] = await Promise.all([
      first,
      second,
    ]);

    expect(firstResult.status).toBe("synchronized");
    expect(secondResult.status).toBe("synchronized");
    expect(saveHistory).toHaveBeenCalledTimes(1);
  });
});

// --------------------------------------------------
// Faza 11.11 — Recovery Integrity & Consistency
// --------------------------------------------------

describe("XSUS Benchmark History Recovery Integrity", () => {
  it("ruan raportet pas rikuperimeve të përsëritura", async () => {
    const {
      persistence,
      storage,
      recovery,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "integrity-1",
      timestamp: 1000,
      report: createReport(85),
    });

    await persistence.addReport({
      id: "integrity-2",
      timestamp: 2000,
      report: createReport(95),
    });

    await recovery.recover();
    await recovery.recover();
    await recovery.recover();

    const result = recovery.getStatus();
    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(result.status).toBe("synchronized");
    expect(result.synchronized).toBe(true);

    expect(savedEntries.map((entry) => entry.id)).toEqual([
      "integrity-1",
      "integrity-2",
    ]);
  });

  it("ruan rendin dhe sequence e raporteve", async () => {
    const {
      persistence,
      storage,
      recovery,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "sequence-1",
      timestamp: 1000,
      report: createReport(80),
    });

    await persistence.addReport({
      id: "sequence-2",
      timestamp: 2000,
      report: createReport(90),
    });

    await persistence.addReport({
      id: "sequence-3",
      timestamp: 3000,
      report: createReport(95),
    });

    await recovery.recover();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(savedEntries.map((entry) => entry.id)).toEqual([
      "sequence-1",
      "sequence-2",
      "sequence-3",
    ]);

    expect(savedEntries.map((entry) => entry.sequence)).toEqual([
      1,
      2,
      3,
    ]);
  });

  it("rikuperohet në një thirrje të re pas dështimit të ruajtjes", async () => {
    const saveHistory = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Dështim i përkohshëm i ruajtjes")
      )
      .mockResolvedValue({
        savedCount: 0,
      });

    const { recovery } = createHarness({ saveHistory }, 0);

    await expect(
      recovery.recover()
    ).rejects.toThrow(
      "Rikuperimi i ruajtjes së historikut benchmark dështoi."
    );

    expect(recovery.getStatus().status).toBe("failed");

    const result = await recovery.recover();

    expect(result.status).toBe("synchronized");
    expect(result.synchronized).toBe(true);
    expect(recovery.getStatus().lastError).toBeNull();
    expect(saveHistory).toHaveBeenCalledTimes(2);
  });

  it("ruan raportet dhe përmbajtjen e tyre gjatë rikuperimit", async () => {
    const {
      persistence,
      storage,
      recovery,
    } = createHarness();

    await persistence.initialize();

    const firstReport = createReport(87);
    const secondReport = createReport(96);

    await persistence.addReport({
      id: "content-1",
      timestamp: 1000,
      report: firstReport,
    });

    await persistence.addReport({
      id: "content-2",
      timestamp: 2000,
      report: secondReport,
    });

    await recovery.recover();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(savedEntries).toHaveLength(2);

    expect(savedEntries[0]).toMatchObject({
      id: "content-1",
      timestamp: 1000,
      sequence: 1,
      report: firstReport,
    });

    expect(savedEntries[1]).toMatchObject({
      id: "content-2",
      timestamp: 2000,
      sequence: 2,
      report: secondReport,
    });
  });
});

// --------------------------------------------------
// Faza 11.12 — Benchmark History Lifecycle & Management
// --------------------------------------------------

describe("XSUS Benchmark History Lifecycle", () => {
  it("fshin një raport pa ndryshuar raportet e tjera", async () => {
    const {
      persistence,
      storage,
      recovery,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "lifecycle-1",
      timestamp: 1000,
      report: createReport(80),
    });

    await persistence.addReport({
      id: "lifecycle-2",
      timestamp: 2000,
      report: createReport(90),
    });

    await persistence.addReport({
      id: "lifecycle-3",
      timestamp: 3000,
      report: createReport(95),
    });

    const removed = await persistence.removeReport("lifecycle-2");

    expect(removed).toBe(true);
    expect(persistence.getHistorySize()).toBe(2);

    // Kontrollojmë përmbajtjen, jo një renditje të papërcaktuar.
    const remainingIds = persistence
      .listReports()
      .map((entry) => entry.id);

    expect(remainingIds).toHaveLength(2);
    expect(remainingIds).toContain("lifecycle-1");
    expect(remainingIds).toContain("lifecycle-3");
    expect(remainingIds).not.toContain("lifecycle-2");

    await recovery.recover();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];
    const savedIds = savedEntries.map((entry) => entry.id);

    expect(savedIds).toHaveLength(2);
    expect(savedIds).toContain("lifecycle-1");
    expect(savedIds).toContain("lifecycle-3");
    expect(savedIds).not.toContain("lifecycle-2");
  });

  it("pastron të gjithë historikun", async () => {
    const {
      persistence,
      recovery,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "clear-1",
      timestamp: 1000,
      report: createReport(80),
    });

    await persistence.addReport({
      id: "clear-2",
      timestamp: 2000,
      report: createReport(90),
    });

    await persistence.clearHistory();

    expect(persistence.getHistorySize()).toBe(0);
    expect(persistence.listReports()).toEqual([]);
    expect(persistence.getLatestReport()).toBeNull();

    await recovery.recover();

    expect(persistence.getHistorySize()).toBe(0);
    expect(persistence.listReports()).toEqual([]);
  });

  it("nuk lejon rikthimin e raportit të fshirë nga storage", async () => {
    const {
      persistence,
      storage,
      recovery,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "deleted-1",
      timestamp: 1000,
      report: createReport(88),
    });

    await persistence.addReport({
      id: "preserved-1",
      timestamp: 2000,
      report: createReport(96),
    });

    await persistence.removeReport("deleted-1");

    await recovery.recover();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(savedEntries.map((entry) => entry.id)).toEqual([
      "preserved-1",
    ]);

    expect(
      persistence.getReportById("deleted-1")
    ).toBeNull();
  });

  it("ruan historikun bosh pas pastrimit edhe në storage", async () => {
    const {
      persistence,
      storage,
    } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "empty-1",
      timestamp: 1000,
      report: createReport(75),
    });

    await persistence.addReport({
      id: "empty-2",
      timestamp: 2000,
      report: createReport(85),
    });

    await persistence.clearHistory();

    const savedEntries = storage.saveHistory.mock.calls.at(-1)?.[0];

    expect(savedEntries).toEqual([]);
    expect(persistence.getHistorySize()).toBe(0);
  });

  it("përditëson numrin dhe raportin e fundit pas fshirjes", async () => {
    const { persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "latest-1",
      timestamp: 1000,
      report: createReport(70),
    });

    await persistence.addReport({
      id: "latest-2",
      timestamp: 2000,
      report: createReport(85),
    });

    await persistence.addReport({
      id: "latest-3",
      timestamp: 3000,
      report: createReport(98),
    });

    expect(persistence.getHistorySize()).toBe(3);
    expect(persistence.getLatestReport().id).toBe("latest-3");

    await persistence.removeReport("latest-3");

    expect(persistence.getHistorySize()).toBe(2);
    expect(persistence.getLatestReport().id).toBe("latest-2");
  });

  it("trajton fshirjen e një raporti që nuk ekziston", async () => {
    const { persistence } = createHarness();

    await persistence.initialize();

    await persistence.addReport({
      id: "existing-1",
      timestamp: 1000,
      report: createReport(90),
    });

    const removed = await persistence.removeReport("missing-report");

    expect(removed).toBe(false);
    expect(persistence.getHistorySize()).toBe(1);

    expect(
      persistence.getReportById("existing-1")
    ).not.toBeNull();
  });
});

describe("XSUS Benchmark History Concurrency & Transaction Safety", () => {
  it("ruan të dy raportet kur shtohen njëkohësisht", async () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    const storage = {
      loadHistory: vi.fn().mockResolvedValue([]),
      saveHistory: vi.fn().mockResolvedValue(undefined),
    };

    const persistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

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
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    let activeWrites = 0;
    let maximumConcurrentWrites = 0;

    const storage = {
      loadHistory: vi.fn().mockResolvedValue([]),

      saveHistory: vi.fn(async () => {
        activeWrites += 1;

        maximumConcurrentWrites = Math.max(
          maximumConcurrentWrites,
          activeWrites
        );

        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });

        activeWrites -= 1;
      }),
    };

    const persistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
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
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    const storage = {
      loadHistory: vi.fn().mockResolvedValue([]),

      saveHistory: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Gabim i simuluar i diskut.")
        )
        .mockResolvedValue(undefined),
    };

    const persistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
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
});

it("ruan gjendjen përfundimtare kur shtimi dhe fshirja ndërthuren", async () => {
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    const storage = {
      loadHistory: vi.fn().mockResolvedValue([]),
      saveHistory: vi.fn().mockResolvedValue(undefined),
    };

    const persistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

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
    const engine =
      createResponseQualityBenchmarkHistoryEngine();

    const storage = {
      loadHistory: vi.fn().mockResolvedValue([]),
      saveHistory: vi.fn().mockResolvedValue(undefined),
    };

    const persistence =
      createResponseQualityBenchmarkHistoryPersistence({
        engine,
        storage,
      });

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
