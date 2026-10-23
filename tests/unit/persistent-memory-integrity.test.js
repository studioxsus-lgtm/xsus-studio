
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
});
