import { describe, expect, it } from "vitest";

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
        title: "Clear Restore Benchmark",
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

function createPersistence(storage) {
  const engine = createResponseQualityBenchmarkHistoryEngine();

  const persistence = createResponseQualityBenchmarkHistoryPersistence({
    engine,
    storage,
  });

  return { engine, persistence };
}

describe(
  "Response Quality Benchmark History — Clear and Restore Cycles Integrity",
  () => {
    it(
      "ruan historikun bosh pas cikleve të përsëritura të pastrimit dhe rikthimit",
      async () => {
        const storage = createStorage();
        const { persistence: initialPersistence } =
          createPersistence(storage);

        await initialPersistence.initialize();

        for (let cycle = 0; cycle < 5; cycle += 1) {
          await initialPersistence.addReport(
            createReport(`cycle-${cycle}-a`),
          );

          await initialPersistence.addReport(
            createReport(`cycle-${cycle}-b`),
          );

          await initialPersistence.flush();

          expect(initialPersistence.getHistorySize()).toBe(2);

          await initialPersistence.clearHistory();

          expect(initialPersistence.getHistorySize()).toBe(0);

          await initialPersistence.flush();

          expect(storage.getSnapshot()).toEqual([]);

          const { persistence: restoredPersistence } =
            createPersistence(storage);

          await restoredPersistence.initialize();

          expect(restoredPersistence.getHistorySize()).toBe(0);
          expect(restoredPersistence.listReports()).toEqual([]);
          expect(restoredPersistence.getLatestReport()).toBeNull();
        }
      },
    );

    it(
      "nuk rikthen raporte të vjetra pas pastrimit dhe shtimit të raporteve të reja",
      async () => {
        const storage = createStorage();
        const { persistence } = createPersistence(storage);

        await persistence.initialize();

        await persistence.addReport(createReport("old-a"));
        await persistence.addReport(createReport("old-b"));
        await persistence.flush();

        expect(persistence.getHistorySize()).toBe(2);

        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(storage.getSnapshot()).toEqual([]);

        await persistence.addReport(
          createReport("new-a", {
            summary: { score: 95 },
          }),
        );

        await persistence.addReport(
          createReport("new-b", {
            summary: { score: 98 },
          }),
        );

        await persistence.flush();

        const { persistence: restoredPersistence } =
          createPersistence(storage);

        await restoredPersistence.initialize();

        expect(restoredPersistence.getHistorySize()).toBe(2);

        expect(
          restoredPersistence
            .listReports()
            .map((entry) => entry.id)
            .sort(),
        ).toEqual(["new-a", "new-b"]);

        expect(restoredPersistence.getReportById("old-a")).toBeNull();
        expect(restoredPersistence.getReportById("old-b")).toBeNull();

        expect(
          restoredPersistence.getReportById("new-a").report.summary.score,
        ).toBe(95);

        expect(
          restoredPersistence.getReportById("new-b").report.summary.score,
        ).toBe(98);
      },
    );

    it(
      "ruan snapshot-et e vjetra edhe pasi historiku pastrohet dhe rikthehet",
      async () => {
        const storage = createStorage();
        const { persistence } = createPersistence(storage);

        await persistence.initialize();

        await persistence.addReport(
          createReport("snapshot-old", {
            summary: { score: 91 },
          }),
        );

        await persistence.flush();

        const oldSnapshot = persistence.getReportById("snapshot-old");

        expect(oldSnapshot).not.toBeNull();
        expect(oldSnapshot.report.summary.score).toBe(91);

        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(storage.getSnapshot()).toEqual([]);

        await persistence.addReport(
          createReport("snapshot-new", {
            summary: { score: 99 },
          }),
        );

        await persistence.flush();

        const { persistence: restoredPersistence } =
          createPersistence(storage);

        await restoredPersistence.initialize();

        expect(restoredPersistence.getReportById("snapshot-old")).toBeNull();

        expect(
          restoredPersistence.getReportById("snapshot-new").report.summary
            .score,
        ).toBe(99);

        // Snapshot-i i marrë më parë mbetet i pandryshuar.
        expect(oldSnapshot.id).toBe("snapshot-old");
        expect(oldSnapshot.report.summary.score).toBe(91);
      },
    );

    it(
      "ruan integritetin gjatë cikleve të shumta persistim-rikthim",
      async () => {
        const storage = createStorage();
        let { persistence } = createPersistence(storage);

        await persistence.initialize();

        for (let cycle = 0; cycle < 4; cycle += 1) {
          const id = `restore-cycle-${cycle}`;

          await persistence.addReport(
            createReport(id, {
              timestamp: 1_800_000_000_000 + cycle,
              summary: {
                score: 80 + cycle,
              },
            }),
          );

          await persistence.flush();

          const { persistence: restoredPersistence } =
            createPersistence(storage);

          await restoredPersistence.initialize();

          expect(restoredPersistence.getHistorySize()).toBe(cycle + 1);

          expect(
            restoredPersistence.getReportById(id).report.summary.score,
          ).toBe(80 + cycle);

          persistence = restoredPersistence;
        }

        expect(persistence.getHistorySize()).toBe(4);
        expect(storage.getSnapshot()).toHaveLength(4);
      },
    );

    it(
      "nuk humb raportet e mbetura kur fshin, rikthen dhe shton raporte",
      async () => {
        const storage = createStorage();
        const { persistence } = createPersistence(storage);

        await persistence.initialize();

        await persistence.addReport(createReport("keep-a"));
        await persistence.addReport(createReport("remove-b"));
        await persistence.addReport(createReport("keep-c"));

        await persistence.flush();

        expect(await persistence.removeReport("remove-b")).toBe(true);

        await persistence.flush();

        const { persistence: restoredPersistence } =
          createPersistence(storage);

        await restoredPersistence.initialize();

        expect(restoredPersistence.getHistorySize()).toBe(2);
        expect(restoredPersistence.getReportById("remove-b")).toBeNull();

        await restoredPersistence.addReport(
          createReport("added-d", {
            summary: { score: 97 },
          }),
        );

        await restoredPersistence.flush();

        const { persistence: finalPersistence } =
          createPersistence(storage);

        await finalPersistence.initialize();

        expect(finalPersistence.getHistorySize()).toBe(3);

        expect(
          finalPersistence
            .listReports()
            .map((entry) => entry.id)
            .sort(),
        ).toEqual(["added-d", "keep-a", "keep-c"]);

        expect(finalPersistence.getReportById("remove-b")).toBeNull();

        expect(
          finalPersistence.getReportById("added-d").report.summary.score,
        ).toBe(97);
      },
    );

    it(
      "ruan historikun bosh pas pastrimeve të përsëritura",
      async () => {
        const storage = createStorage();
        const { persistence } = createPersistence(storage);

        await persistence.initialize();

        // Pastrimi i historikut që është tashmë bosh.
        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(storage.getSnapshot()).toEqual([]);

        // Pastrim i dytë i historikut bosh.
        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(storage.getSnapshot()).toEqual([]);

        // Shtojmë një raport dhe pastaj e pastrojmë.
        await persistence.addReport(createReport("empty-cycle-a"));
        await persistence.flush();

        expect(persistence.getHistorySize()).toBe(1);

        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(storage.getSnapshot()).toEqual([]);

        // Pastrim tjetër pasi historiku është bosh.
        await persistence.clearHistory();

        expect(persistence.getHistorySize()).toBe(0);

        await persistence.flush();

        expect(persistence.getHistorySize()).toBe(0);
        expect(storage.getSnapshot()).toEqual([]);
      },
    );

    it(
      "ruan të dhënat e raporteve të reja pas disa cikleve pastrim-rikthim",
      async () => {
        const storage = createStorage();
        const { persistence } = createPersistence(storage);

        await persistence.initialize();

        for (let cycle = 0; cycle < 3; cycle += 1) {
          const id = `integrity-${cycle}`;

          await persistence.addReport(
            createReport(id, {
              summary: {
                score: 90 + cycle,
              },
            }),
          );

          await persistence.flush();

          const { persistence: restoredPersistence } =
            createPersistence(storage);

          await restoredPersistence.initialize();

          expect(
            restoredPersistence.getReportById(id).report.summary.score,
          ).toBe(90 + cycle);

          if (cycle < 2) {
            expect(restoredPersistence.getHistorySize()).toBe(cycle + 1);

            await restoredPersistence.clearHistory();

            expect(restoredPersistence.getHistorySize()).toBe(0);

            await restoredPersistence.flush();

            expect(storage.getSnapshot()).toEqual([]);
          } else {
            expect(restoredPersistence.getHistorySize()).toBe(1);
            expect(storage.getSnapshot()).toHaveLength(1);

            expect(
              restoredPersistence.getReportById(id).report.summary.score,
            ).toBe(92);
          }
        }
      },
    );
  },
);
