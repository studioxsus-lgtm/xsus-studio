
import { describe, expect, test } from "vitest";

import {
  MEMORY_DIAGNOSTICS_VERSION,
  MEMORY_DIAGNOSTIC_CODES,
  checkJSONSerializable,
  diagnoseMemorySnapshot,
  diagnoseMemoryStorage,
  diagnoseStoredMemory
} from "../../src/core/memory-diagnostics.js";

function createStorage(initialEntries = {}) {
  const data = new Map(Object.entries(initialEntries));

  return {
    async get(key) {
      return data.get(key);
    },

    async set(key, value) {
      data.set(key, value);
    },

    async delete(key) {
      data.delete(key);
    }
  };
}

describe("XSUS AI Core — Memory Diagnostics", () => {
  test("përdor versionin e pritshëm", () => {
    expect(MEMORY_DIAGNOSTICS_VERSION).toBe("1.0.0");
  });

  test("pranon një snapshot të vlefshëm", () => {
    const snapshot = {
      sessionId: "session-1",
      messages: [
        {
          role: "user",
          content: "Përshëndetje",
          timestamp: "2026-10-22T10:00:00.000Z"
        },
        {
          role: "assistant",
          content: "Përshëndetje! Si mund të ndihmoj?"
        }
      ]
    };

    const result = diagnoseMemorySnapshot(snapshot);

    expect(result.valid).toBe(true);
    expect(result.status).toBe("healthy");
    expect(result.issueCount).toBe(0);
    expect(result.issues).toEqual([]);
  });

  test("refuzon snapshot që nuk është objekt i thjeshtë", () => {
    const result = diagnoseMemorySnapshot(null);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_SNAPSHOT
      })
    );
  });

  test("zbulon identitet të pavlefshëm të sesionit", () => {
    const result = diagnoseMemorySnapshot({
      sessionId: "   "
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_SESSION_ID
      })
    );
  });

  test("zbulon mospërputhjen e identitetit të sesionit", () => {
    const result = diagnoseMemorySnapshot(
      {
        sessionId: "session-A",
        messages: []
      },
      {
        expectedSessionId: "session-B"
      }
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.SESSION_ID_MISMATCH
      })
    );
  });

  test("zbulon messages që nuk është listë", () => {
    const result = diagnoseMemorySnapshot({
      sessionId: "session-1",
      messages: "jo-listë"
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGES
      })
    );
  });

  test("zbulon mesazhe me strukturë të pavlefshme", () => {
    const result = diagnoseMemorySnapshot({
      sessionId: "session-1",
      messages: [
        null,
        {
          role: "",
          content: 123
        }
      ]
    });

    expect(result.valid).toBe(false);

    expect(
      result.issues.filter(
        issue =>
          issue.code === MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGE
      ).length
    ).toBeGreaterThanOrEqual(3);
  });

  test("zbulon timestamp të pavlefshëm", () => {
    const result = diagnoseMemorySnapshot({
      messages: [
        {
          role: "user",
          content: "Test",
          timestamp: "datë-e-pavlefshme"
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_TIMESTAMP
      })
    );
  });

  test("kontrollon serializimin JSON", () => {
    expect(
      checkJSONSerializable({ message: "XSUS AI" }).valid
    ).toBe(true);

    expect(
      checkJSONSerializable(undefined).valid
    ).toBe(false);

    const circular = {};
    circular.self = circular;

    expect(
      checkJSONSerializable(circular).valid
    ).toBe(false);
  });

  test("pranon storage me metodat e nevojshme", () => {
    const result = diagnoseMemoryStorage(createStorage());

    expect(result.valid).toBe(true);
    expect(result.issueCount).toBe(0);
  });

  test("refuzon storage me metoda që mungojnë", () => {
    const result = diagnoseMemoryStorage({});

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_STORAGE
      })
    );
  });

  test("diagnostikon snapshot nga storage", async () => {
    const snapshot = {
      sessionId: "session-1",
      messages: [
        {
          role: "user",
          content: "Test"
        }
      ]
    };

    const storage = createStorage({
      "session-1": snapshot
    });

    const result = await diagnoseStoredMemory(
      storage,
      "session-1",
      { expectedSessionId: "session-1" }
    );

    expect(result.valid).toBe(true);
    expect(result.snapshot).toEqual(snapshot);
  });

  test("raporton snapshot që mungon", async () => {
    const storage = createStorage();

    const result = await diagnoseStoredMemory(
      storage,
      "missing-session"
    );

    expect(result.valid).toBe(false);
    expect(result.snapshot).toBeNull();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.INVALID_SNAPSHOT
      })
    );
  });

  test("raporton gabimet gjatë leximit nga storage", async () => {
    const storage = {
      async get() {
        throw new Error("Leximi dështoi.");
      },
      async set() {},
      async delete() {}
    };

    const result = await diagnoseStoredMemory(
      storage,
      "session-1"
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_DIAGNOSTIC_CODES.STORAGE_READ_FAILED
      })
    );
  });

  test("nuk ndryshon snapshot-in gjatë diagnostikimit", async () => {
    const snapshot = {
      sessionId: "session-1",
      messages: [
        {
          role: "user",
          content: "Ruaje këtë mesazh."
        }
      ]
    };

    const original = structuredClone(snapshot);
    const storage = createStorage({
      "session-1": snapshot
    });

    await diagnoseStoredMemory(storage, "session-1");

    expect(await storage.get("session-1")).toEqual(original);
  });
});
