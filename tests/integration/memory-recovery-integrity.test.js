
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
  let persistence;

  function createTestPersistence() {
    const storage = createMemoryStorageAdapter();

    persistence = createMemoryPersistence({
      storage,
      prefix: "xsus-test:"
    });

    return persistence;
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

    const result = await memory.restoreSession(
      "missing-session-92841"
    );

    expect(result.success).toBe(false);
    expect(hasMemorySession("missing-session-92841")).toBe(false);
  });

  test("nuk lejon rikthim të dyfishtë të të njëjtit sesion aktiv", async () => {
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

    const firstRestore = await memory.restoreSession(sessionId);

    // Sesioni ekziston tashmë në RAM; rikthimi i dytë
    // nuk duhet të shtojë kopje të mesazheve.
    expect(firstRestore.success).toBe(false);

    expect(getMemoryHistory(sessionId)).toHaveLength(1);
  });

  test("ruan numrin e mesazheve pas disa cikleve ruajtje-rikthim", async () => {
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

  test("fshirja e sesionit aktiv nuk ndikon në sesionin tjetër", () => {
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

    expect(getMemoryHistory(secondId)).toHaveLength(1);
    expect(getMemoryHistory(secondId)[0].content).toBe(
      "Biseda që duhet të mbetet."
    );
  });
});
