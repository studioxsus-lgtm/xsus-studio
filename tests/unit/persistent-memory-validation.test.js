
import { describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
} from "../../src/core/persistent-memory.js";

function createHarness(record) {
  const storage = {
    get: vi.fn(async () => record),
    set: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };

  const importSession = vi.fn(async () => ({
    success: true,
    restored: true,
  }));

  const persistence = createPersistentMemory({
    storage,
    exportSession: vi.fn(async () => ({
      schemaVersion: 1,
      session: { sessionId: "validation-session" },
      messages: [],
    })),
    importSession,
  });

  return { persistence, storage, importSession };
}

describe("XSUS AI Core — Persistent memory validation", () => {
  test("refuzon ID bosh ose tepër të gjatë", async () => {
    const { persistence, storage } = createHarness(null);

    await expect(
      persistence.restoreSession("   ")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });

    await expect(
      persistence.restoreSession("x".repeat(129))
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });

    expect(storage.get).not.toHaveBeenCalled();
  });

  test("refuzon rekord me sessionId që nuk përputhet", async () => {
    const { persistence, importSession } = createHarness({
      version: "1.0.0",
      sessionId: "another-session",
      snapshot: {
        schemaVersion: 1,
        session: { sessionId: "validation-session" },
        messages: [],
      },
    });

    await expect(
      persistence.restoreSession("validation-session")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });

    expect(importSession).not.toHaveBeenCalled();
  });

  test("refuzon rekord pa snapshot të vlefshëm", async () => {
    const invalidRecords = [
      {
        sessionId: "validation-session",
        snapshot: null,
      },
      {
        sessionId: "validation-session",
        snapshot: "tekst",
      },
      {
        sessionId: "validation-session",
      },
    ];

    for (const record of invalidRecords) {
      const { persistence, importSession } = createHarness(record);

      await expect(
        persistence.restoreSession("validation-session")
      ).rejects.toMatchObject({
        code: "INVALID_SESSION_RECORD",
      });

      expect(importSession).not.toHaveBeenCalled();
    }
  });

  test("e mbështjell gabimin e storage.get me kodin e duhur", async () => {
    const storageError = new Error("Disk read failed");

    const storage = {
      get: vi.fn(async () => {
        throw storageError;
      }),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    };

    const persistence = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession: vi.fn(),
    });

    await expect(
      persistence.restoreSession("validation-session")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
      cause: storageError,
    });
  });

  test("nuk e thërret importSession kur sesioni mungon", async () => {
    const { persistence, importSession } = createHarness(null);

    const result = await persistence.restoreSession(
      "validation-session"
    );

    expect(result).toMatchObject({
      success: false,
      restored: false,
      sessionId: "validation-session",
      reason: "SESSION_NOT_FOUND",
    });

    expect(importSession).not.toHaveBeenCalled();
  });
});
