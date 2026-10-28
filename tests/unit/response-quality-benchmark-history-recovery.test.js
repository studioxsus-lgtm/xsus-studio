
/**
 * XSUS AI Core — Benchmark History Persistence Recovery Tests
 * Version: 1.0.0
 *
 * Teston:
 * - Rikuperimin kur skedari mungon.
 * - Refuzimin e JSON-it të dëmtuar.
 * - Refuzimin e dokumenteve të pavlefshme.
 * - Refuzimin e historikut me hyrje të pavlefshme.
 * - Ruajtjen e të dhënave pas ringarkimit.
 * - Trajtimin e gabimeve të leximit dhe shkrimit.
 * - Ruajtjen e skedarit ekzistues kur validimi dështon.
 */

import { describe, expect, it } from "vitest";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createResponseQualityBenchmarkHistoryStorage,
} from "../../src/core/response-quality-benchmark-history-storage.js";

async function createTempDirectory() {
  return mkdtemp(
    join(tmpdir(), "xsus-history-recovery-")
  );
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

describe("XSUS Benchmark History Persistence Recovery", () => {
  it("rikthen historik bosh kur skedari nuk ekziston", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "missing.json");

    try {
      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.loadHistory()
      ).resolves.toEqual([]);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("refuzon JSON të dëmtuar pa e trajtuar si histori bosh", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      await writeFile(
        filePath,
        '{"format": invalid',
        "utf8"
      );

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.loadHistory()
      ).rejects.toThrow(
        "Skedari i historikut benchmark përmban JSON të pavlefshëm."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
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

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.loadHistory()
      ).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("refuzon hyrjet me timestamp të pavlefshëm", async () => {
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

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.loadHistory()
      ).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
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

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.loadHistory()
      ).rejects.toThrow(
        "Validimi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("ruan integritetin e historikut pas save dhe load", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage =
        createResponseQualityBenchmarkHistoryStorage({
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
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("refuzon ruajtjen e historikut që nuk është array", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.saveHistory({})
      ).rejects.toThrow(
        "history duhet të jetë një array."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("nuk zëvendëson skedarin ekzistues kur validimi dështon", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const originalDocument = createDocument();

      await writeFile(
        filePath,
        JSON.stringify(originalDocument),
        "utf8"
      );

      const originalContents = await readFile(
        filePath,
        "utf8"
      );

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
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

      const finalContents = await readFile(
        filePath,
        "utf8"
      );

      expect(finalContents).toBe(originalContents);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("trajton gabimin e leximit kur rruga është direktori", async () => {
    const directory = await createTempDirectory();

    try {
      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath: directory,
        });

      await expect(
        storage.loadHistory()
      ).rejects.toThrow(
        "Leximi i historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("trajton gabimin e shkrimit kur drejtoria prind mungon", async () => {
    const directory = await createTempDirectory();

    try {
      const filePath = join(
        directory,
        "missing-directory",
        "history.json"
      );

      const storage =
        createResponseQualityBenchmarkHistoryStorage({
          filePath,
        });

      await expect(
        storage.saveHistory([createEntry()])
      ).rejects.toThrow(
        "Ruajtja e historikut benchmark dështoi."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("nuk krijon skedar të ri kur historiku ka ID të përsëritura", async () => {
    const directory = await createTempDirectory();
    const filePath = join(directory, "history.json");

    try {
      const storage =
        createResponseQualityBenchmarkHistoryStorage({
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
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
