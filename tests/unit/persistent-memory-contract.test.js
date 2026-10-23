
import { describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
} from "../../src/core/persistent-memory.js";

describe("XSUS AI Core — Persistent memory contract", () => {
  test("refuzon storage pa metodat e kërkuara", () => {
    expect(() =>
      createPersistentMemory({
        storage: {},
        exportSession: vi.fn(),
        importSession: vi.fn(),
        deleteSession: vi.fn(),
      })
    ).toThrow();
  });

  test("ruan dhe rikthen snapshot-in e një sesioni", async () => {
    const records = new Map();

    const storage = {
      get: vi.fn(async (key) => records.get(key) ?? null),
      set: vi.fn(async (key, value) => {
        records.set(key, value);
      }),
      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };

    const snapshot = {
      schemaVersion: 1,
      session: { sessionId: "contract-session" },
      messages: [
        {
          role: "user",
          content: "Përshëndetje XSUS AI",
        },
      ],
    };

    const importSession = vi.fn(async () => ({
      success: true,
      restored: true,
      sessionId: "contract-session",
    }));

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:contract:",
      exportSession: vi.fn(async () => snapshot),
      importSession,
      deleteSession: vi.fn(async () => ({ success: true })),
    });

    await persistence.saveSession("contract-session");

    expect(storage.set).toHaveBeenCalledOnce();

    const result = await persistence.restoreSession(
      "contract-session"
    );

    expect(result.success).toBe(true);
    expect(importSession).toHaveBeenCalledOnce();

    const restoredSnapshot = importSession.mock.calls[0][1];

    expect(restoredSnapshot).toEqual(snapshot);
    expect(restoredSnapshot).not.toBe(snapshot);
  });

  test("raporton sesionin që mungon pa e rikthyer", async () => {
    const storage = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    };

    const importSession = vi.fn();

    const persistence = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession,
      deleteSession: vi.fn(),
    });

    const result = await persistence.restoreSession(
      "missing-contract-session"
    );

    expect(result.success).toBe(false);
    expect(result.restored).toBe(false);
    expect(result.reason).toBe("SESSION_NOT_FOUND");
    expect(importSession).not.toHaveBeenCalled();
  });
});
