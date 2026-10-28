
/**
 * XSUS AI Core — Benchmark History Persistence & Recovery Tests
 * Version: 1.1.0
 *
 * Përfshin:
 * - Testet e storage JSON (Faza 11.8).
 * - Testet e integrimit dhe rikthimit (Faza 11.9–11.10).
 * - Validimin e historikut dhe integritetin e të dhënave.
 * - Riprovimin pas dështimit të ruajtjes.
 * - Kontrollin e gjendjes së sinkronizimit.
 * - Testimin e thirrjeve paralele të rikuperimit.
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
// Faza 11.8 — Storage persistence recovery
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
      ).rejects.toThrow("ID e përsëritur në history: same.");

      await expect(readFile(filePath, "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------
// Faza 11.10 — Recovery integration
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
      .mockResolvedValueOnce({ savedCount: 0 });

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

    await expect(recovery.recover()).rejects.toMatchObject({
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

    await expect(recovery.recover()).rejects.toThrow(
      "Rikuperimi i ruajtjes së historikut benchmark dështoi."
    );

    expect(recovery.getStatus()).toMatchObject({
      status: "failed",
      synchronized: false,
      totalAttempts: 1,
    });
  });

  it("ruan raportet aktuale të historikut", async () => {
    const { engine, storage, recovery } = createHarness();

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

    const savedEntries = storage.saveHistory.mock.calls.at(-1)[0];

    expect(savedEntries.map((entry) => entry.id)).toEqual([
      "report-1",
      "report-2",
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
