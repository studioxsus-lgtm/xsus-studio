/**
 * XSUS AI Core — Benchmark History Persistence Integrity
 * Faza 11.14.2
 *
 * Verifikon:
 * - Ruajtjen dhe rikthimin e historikut.
 * - Integritetin e raporteve pas rikuperimit.
 * - Ruajtjen e timestamp-eve.
 * - Rendin e futjes pas rikuperimit.
 * - Sjelljen me storage bosh.
 * - Refuzimin e inicializimit mbi engine jo bosh.
 * - Rikuperimin pas dështimit të inicializimit.
 * - Vazhdimin pas një dështimi në ruajtje.
 */

import { describe, expect, it, vi } from "vitest";

import {
  createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
  createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createReport(index) {
  return {
    summary: {
      total: 3,
      passed: 2,
      failed: 1,
      score: index * 10,
    },
    results: [
      {
        id: `case-${index}-1`,
        status: "passed",
      },
      {
        id: `case-${index}-2`,
        status: "passed",
      },
      {
        id: `case-${index}-3`,
        status: "failed",
      },
    ],
  };
}

function createEntry(index, timestamp = index * 100) {
  return {
    id: `benchmark-${index}`,
    timestamp,
    report: createReport(index),
  };
}

function createHarness({
  maxEntries = 100,
  initialHistory,
  loadHistory = vi.fn().mockResolvedValue([]),
  saveHistory = vi.fn().mockResolvedValue(undefined),
} = {}) {
  const engine = createResponseQualityBenchmarkHistoryEngine({
    maxEntries,
  });

  const storage = {
    loadHistory,
    saveHistory,
  };

  // Vendos historikun fillestar vetëm kur është specifikuar.
  // Ruaj sjelljen e mock-eve të personalizuara.
  if (initialHistory !== undefined) {
    loadHistory.mockResolvedValue(initialHistory);
  }

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

describe(
  "XSUS AI Core — Benchmark History Persistence Integrity",
  () => {
    it(
      "ruan dhe rikthen raportet pa humbje të të dhënave",
      async () => {
        const savedHistory = [];

        const first = createHarness({
          saveHistory: vi.fn(async (snapshot) => {
            savedHistory.splice(
              0,
              savedHistory.length,
              ...structuredClone(snapshot)
            );
          }),
        });

        await first.persistence.initialize();

        await first.persistence.addReport(
          createEntry(1, 1000)
        );

        await first.persistence.addReport(
          createEntry(2, 2000)
        );

        await first.persistence.addReport(
          createEntry(3, 3000)
        );

        expect(savedHistory).toHaveLength(3);

        const second = createHarness({
          initialHistory: structuredClone(savedHistory),
        });

        await second.persistence.initialize();

        expect(
          second.persistence.getHistorySize()
        ).toBe(3);

        for (let index = 1; index <= 3; index += 1) {
          const restored =
            second.persistence.getReportById(
              `benchmark-${index}`
            );

          expect(restored).not.toBeNull();
          expect(restored.timestamp).toBe(index * 1000);
          expect(restored.report).toEqual(
            createReport(index)
          );
        }
      }
    );

    it(
      "ruan rendin e futjes pas rikuperimit edhe kur timestamp-et janë të njëjta",
      async () => {
        const originalHistory = [
          {
            ...createEntry(1, 500),
            sequence: 1,
          },
          {
            ...createEntry(2, 500),
            sequence: 2,
          },
          {
            ...createEntry(3, 500),
            sequence: 3,
          },
        ];

        const harness = createHarness({
          initialHistory: originalHistory,
        });

        await harness.persistence.initialize();

        expect(
          harness.persistence.listReports().map(
            (entry) => entry.id
          )
        ).toEqual([
          "benchmark-3",
          "benchmark-2",
          "benchmark-1",
        ]);

        expect(
          harness.persistence.getLatestReport().id
        ).toBe("benchmark-3");
      }
    );

    it(
      "inicializon saktë historikun kur storage është bosh",
      async () => {
        const harness = createHarness({
          initialHistory: [],
        });

        const metadata =
          await harness.persistence.initialize();

        expect(metadata.initialized).toBe(true);
        expect(metadata.historySize).toBe(0);

        expect(
          harness.persistence.listReports()
        ).toEqual([]);

        expect(
          harness.persistence.getLatestReport()
        ).toBeNull();

        expect(
          harness.storage.loadHistory
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "refuzon inicializimin kur engine është tashmë i mbushur",
      async () => {
        const engine =
          createResponseQualityBenchmarkHistoryEngine();

        engine.addReport(createEntry(99, 9900));

        const storage = {
          loadHistory: vi.fn().mockResolvedValue([]),
          saveHistory: vi.fn().mockResolvedValue(undefined),
        };

        const persistence =
          createResponseQualityBenchmarkHistoryPersistence({
            engine,
            storage,
          });

        await expect(
          persistence.initialize()
        ).rejects.toThrow(
          "Inicializimi i historikut benchmark dështoi."
        );

        expect(engine.getHistorySize()).toBe(0);

        expect(
          storage.loadHistory
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "pastron historikun pjesërisht të rikthyer kur një hyrje është e pavlefshme",
      async () => {
        const initialHistory = [
          {
            ...createEntry(1, 100),
            sequence: 1,
          },
          {
            id: "invalid-entry",
            timestamp: -1,
            report: createReport(2),
            sequence: 2,
          },
        ];

        const harness = createHarness({
          initialHistory,
        });

        await expect(
          harness.persistence.initialize()
        ).rejects.toThrow(
          "Inicializimi i historikut benchmark dështoi."
        );

        expect(
          harness.persistence.getMetadata().initialized
        ).toBe(false);

        expect(
          harness.engine.getHistorySize()
        ).toBe(0);
      }
    );

    it(
      "nuk e shënon historikun si të inicializuar kur storage kthen vlerë jo-array",
      async () => {
        const harness = createHarness({
          loadHistory: vi.fn().mockResolvedValue({
            entries: [],
          }),
        });

        await expect(
          harness.persistence.initialize()
        ).rejects.toThrow(
          "Inicializimi i historikut benchmark dështoi."
        );

        expect(
          harness.persistence.getMetadata().initialized
        ).toBe(false);

        expect(
          harness.engine.getHistorySize()
        ).toBe(0);
      }
    );

    it(
      "vazhdon të ruajë pas një dështimi të përkohshëm të storage",
      async () => {
        const saveHistory = vi
          .fn()
          .mockRejectedValueOnce(
            new Error("Gabim i simuluar i diskut.")
          )
          .mockResolvedValue(undefined);

        const harness = createHarness({
          saveHistory,
        });

        await harness.persistence.initialize();

        await expect(
          harness.persistence.addReport(
            createEntry(1, 100)
          )
        ).rejects.toThrow(
          "Sinkronizimi i historikut benchmark me diskun dështoi."
        );

        expect(
          harness.persistence.getHistorySize()
        ).toBe(1);

        await expect(
          harness.persistence.addReport(
            createEntry(2, 200)
          )
        ).resolves.toMatchObject({
          id: "benchmark-2",
        });

        await harness.persistence.flush();

        expect(saveHistory).toHaveBeenCalledTimes(2);

        expect(
          saveHistory.mock.calls[1][0].map(
            (entry) => entry.id
          )
        ).toEqual([
          "benchmark-1",
          "benchmark-2",
        ]);
      }
    );

    it(
      "ruan metadata konsistente pas rikuperimit dhe shtimit të raporteve",
      async () => {
        const harness = createHarness({
          initialHistory: [
            {
              ...createEntry(1, 100),
              sequence: 1,
            },
            {
              ...createEntry(2, 200),
              sequence: 2,
            },
          ],
        });

        await harness.persistence.initialize();

        expect(
          harness.persistence.getMetadata()
        ).toMatchObject({
          version: "1.0.0",
          initialized: true,
          historySize: 2,
          engine: {
            version: "1.0.0",
            entryCount: 2,
          },
        });

        await harness.persistence.addReport(
          createEntry(3, 300)
        );

        expect(
          harness.persistence.getMetadata()
        ).toMatchObject({
          initialized: true,
          historySize: 3,
          engine: {
            entryCount: 3,
          },
        });
      }
    );
  }
);
