
import { describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
} from "../../src/core/persistent-memory.js";

describe("XSUS AI Core — Snapshot integrity", () => {
  test("snapshot-i i ruajtur është i izoluar nga ndryshimet e jashtme", async () => {
    const records = new Map();

    const storage = {
      get: vi.fn(async (key) => records.get(key) ?? null),
      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),
      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };

    const originalSnapshot = {
      schemaVersion: 1,
      session: { sessionId: "integrity-session" },
      messages: [
        {
          role: "user",
          content: "Mesazh origjinal",
          metadata: { language: "sq" },
        },
      ],
    };

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:integrity:",
      exportSession: vi.fn(async () => originalSnapshot),
      importSession: vi.fn(async () => ({
        success: true,
        restored: true,
        sessionId: "integrity-session",
      })),
      deleteSession: vi.fn(async () => ({ success: true })),
    });

    await persistence.saveSession("integrity-session");

    originalSnapshot.messages[0].content = "Mesazh i ndryshuar";
    originalSnapshot.messages[0].metadata.language = "en";

    const savedRecord = [...records.values()][0];

    expect(savedRecord.snapshot.messages[0].content)
      .toBe("Mesazh origjinal");

    expect(savedRecord.snapshot.messages[0].metadata.language)
      .toBe("sq");
  });

  test("ndryshimi i snapshot-it të rikthyer nuk prek të dhënat e ruajtura", async () => {
    const records = new Map();

    const storage = {
      get: vi.fn(async (key) => {
        const value = records.get(key);
        return value === undefined ? null : structuredClone(value);
      }),
      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),
      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };

    const snapshot = {
      schemaVersion: 1,
      session: { sessionId: "restore-integrity-session" },
      messages: [
        {
          role: "user",
          content: "Mos ndrysho origjinalin",
        },
      ],
    };

    let importedSnapshot;

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:restore-integrity:",
      exportSession: vi.fn(async () => snapshot),
      importSession: vi.fn(async (_sessionId, restoredSnapshot) => {
        importedSnapshot = restoredSnapshot;

        return {
          success: true,
          restored: true,
          sessionId: "restore-integrity-session",
        };
      }),
      deleteSession: vi.fn(async () => ({ success: true })),
    });

    await persistence.saveSession("restore-integrity-session");
    await persistence.restoreSession("restore-integrity-session");

    expect(importedSnapshot).toBeDefined();
    expect(importedSnapshot).not.toBe(snapshot);

    importedSnapshot.messages[0].content = "Ndryshim i përkohshëm";

    const savedRecord = [...records.values()][0];

    expect(savedRecord.snapshot.messages[0].content)
      .toBe("Mos ndrysho origjinalin");
  });

  test("refuzon snapshot-in që i përket një sesioni tjetër", async () => {
    const records = new Map();

    const storage = {
      get: vi.fn(async (key) => {
        const value = records.get(key);
        return value === undefined ? null : structuredClone(value);
      }),
      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),
      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:mismatch:",
      exportSession: vi.fn(async () => ({
        schemaVersion: 1,
        session: { sessionId: "session-B" },
        messages: [],
      })),
      importSession: vi.fn(async () => ({
        success: true,
        restored: true,
      })),
    });

    await expect(persistence.saveSession("session-A"))
      .rejects.toThrow();

    expect(records.size).toBe(0);
  });

  test("ruajtja paralele nuk duhet të lejojë që snapshot-i i vjetër të mbishkruajë të riun", async () => {
    let releaseFirstWrite;
    let signalFirstWriteStarted;

    const firstWriteStarted = new Promise((resolve) => {
      signalFirstWriteStarted = resolve;
    });

    const firstWriteGate = new Promise((resolve) => {
      releaseFirstWrite = resolve;
    });

    const records = new Map();
    let writeCount = 0;
    let exportCount = 0;

    const storage = {
      get: vi.fn(async (key) => {
        const value = records.get(key);
        return value === undefined ? null : structuredClone(value);
      }),

      set: vi.fn(async (key, value) => {
        writeCount += 1;
        const currentWrite = writeCount;

        if (currentWrite === 1) {
          signalFirstWriteStarted();
          await firstWriteGate;
        }

        records.set(key, structuredClone(value));
      }),

      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:memory:session:",

      exportSession: vi.fn(async (sessionId) => {
        exportCount += 1;

        return {
          sessionId,
          messages: [
            {
              role: "user",
              content:
                exportCount === 1
                  ? "snapshot i vjetër"
                  : "snapshot i ri",
            },
          ],
        };
      }),

      importSession: vi.fn(async () => ({
        success: true,
        restored: true,
      })),

      deleteSession: vi.fn(async () => ({ success: true })),
    });

    const firstSave = persistence.saveSession("session-A");

    await firstWriteStarted;

    const secondSave = persistence.saveSession("session-A");
    await secondSave;

    releaseFirstWrite();
    await firstSave;

    const savedRecord = records.get(
      "xsus:memory:session:session-A",
    );

    expect(savedRecord).toBeDefined();

    expect(savedRecord.snapshot.messages[0].content)
      .toBe("snapshot i ri");
  });
});
