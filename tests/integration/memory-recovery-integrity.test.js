
import { afterEach, describe, expect, test } from "vitest";

import {
  createMemorySession,
  hasMemorySession,
  getMemoryHistory,
  addMemoryMessage,
  deleteMemorySession,
  clearAllMemory
} from "../../src/core/memory-engine.js";

import {
  createMemoryPersistence
} from "../../src/core/memory-persistence-integration.js";

import {
  createMemoryStorageAdapter
} from "../../src/core/memory-storage.js";

describe("XSUS AI Core — Memory Recovery & Integrity", () => {
  function createTestPersistence() {
    const storage = createMemoryStorageAdapter();

    return createMemoryPersistence({
      storage,
      prefix: "xsus-test:"
    });
  }

  afterEach(() => {
    clearAllMemory();
  });

  test("ruan dhe rikthen historikun e një sesioni", async () => {
    const memory = createTestPersistence();
    const sessionId = "recovery-session-001";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Dua të mësoj programim."
    });

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Mund të fillosh me JavaScript."
    });

    const saved = await memory.saveSession(sessionId);

    expect(saved.success).toBe(true);

    deleteMemorySession(sessionId);

    expect(hasMemorySession(sessionId)).toBe(false);

    const restored = await memory.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe(
      "Dua të mësoj programim."
    );
    expect(history[1].role).toBe("assistant");
    expect(history[1].content).toBe(
      "Mund të fillosh me JavaScript."
    );
  });

  test("izolon historikun e dy sesioneve", async () => {
    const memory = createTestPersistence();

    const firstId = "isolated-session-A";
    const secondId = "isolated-session-B";

    createMemorySession({
      sessionId: firstId,
      language: "sq"
    });

    createMemorySession({
      sessionId: secondId,
      language: "en"
    });

    addMemoryMessage({
      sessionId: firstId,
      role: "user",
      content: "Mesazh vetëm për sesionin A."
    });

    addMemoryMessage({
      sessionId: secondId,
      role: "user",
      content: "Message only for session B."
    });

    await memory.saveSession(firstId);
    await memory.saveSession(secondId);

    const firstHistory = getMemoryHistory(firstId);
    const secondHistory = getMemoryHistory(secondId);

    expect(firstHistory).toHaveLength(1);
    expect(secondHistory).toHaveLength(1);

    expect(firstHistory[0].content).toBe(
      "Mesazh vetëm për sesionin A."
    );

    expect(secondHistory[0].content).toBe(
      "Message only for session B."
    );
  });

  test("nuk rikthen një sesion që nuk është ruajtur", async () => {
    const memory = createTestPersistence();
    const sessionId = "missing-session-92841";

    const result = await memory.restoreSession(sessionId);

    expect(result.success).toBe(false);
    expect(hasMemorySession(sessionId)).toBe(false);
  });

  test("refuzon rikthimin e një sesioni që është aktiv", async () => {
    const memory = createTestPersistence();
    const sessionId = "duplicate-restore-session";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazh fillestar."
    });

    const saved = await memory.saveSession(sessionId);

    expect(saved.success).toBe(true);

    await expect(
      memory.restoreSession(sessionId)
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED"
    });

    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("Mesazh fillestar.");
  });

  test("ruan historikun pa dublikuar mesazhet pas disa cikleve", async () => {
    const memory = createTestPersistence();
    const sessionId = "round-trip-session";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazhi 1."
    });

    await memory.saveSession(sessionId);

    deleteMemorySession(sessionId);

    const restored = await memory.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(getMemoryHistory(sessionId)).toHaveLength(1);

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Përgjigjja 1."
    });

    await memory.saveSession(sessionId);

    deleteMemorySession(sessionId);

    const restoredAgain = await memory.restoreSession(sessionId);

    expect(restoredAgain.success).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history.map(message => message.content)).toEqual([
      "Mesazhi 1.",
      "Përgjigjja 1."
    ]);
  });

  test("fshirja e një sesioni nuk ndikon në tjetrin", () => {
    const firstId = "delete-isolation-A";
    const secondId = "delete-isolation-B";

    createMemorySession({
      sessionId: firstId,
      language: "sq"
    });

    createMemorySession({
      sessionId: secondId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId: firstId,
      role: "user",
      content: "Biseda që do të fshihet."
    });

    addMemoryMessage({
      sessionId: secondId,
      role: "user",
      content: "Biseda që duhet të mbetet."
    });

    deleteMemorySession(firstId);

    expect(hasMemorySession(firstId)).toBe(false);
    expect(hasMemorySession(secondId)).toBe(true);

    const remainingHistory = getMemoryHistory(secondId);

    expect(remainingHistory).toHaveLength(1);
    expect(remainingHistory[0].content).toBe(
      "Biseda që duhet të mbetet."
    );
  });
});
