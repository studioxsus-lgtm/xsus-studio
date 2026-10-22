
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  createJSONMemoryStorage
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — JSON Memory Recovery", () => {
  let temporaryDirectories = [];

  async function createTestEnvironment() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-memory-test-")
    );

    temporaryDirectories.push(directory);

    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus-json-test:"
    });

    return {
      directory,
      filePath,
      storage,
      persistence
    };
  }

  afterEach(async () => {
    clearAllMemory();

    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, {
          recursive: true,
          force: true
        })
      )
    );

    temporaryDirectories = [];
  });

  test("ruan dhe rikthen historikun nga skedari JSON", async () => {
    const {
      filePath,
      persistence
    } = await createTestEnvironment();

    const sessionId = "json-recovery-session";

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
      content: "Fillo me bazat e JavaScript."
    });

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);

    deleteMemorySession(sessionId);

    expect(hasMemorySession(sessionId)).toBe(false);

    // Krijo storage dhe persistence të reja mbi të njëjtin skedar.
    const newStorage = createJSONMemoryStorage({ filePath });

    const newPersistence = createMemoryPersistence({
      storage: newStorage,
      prefix: "xsus-json-test:"
    });

    const restored = await newPersistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history.map(message => message.content)).toEqual([
      "Dua të mësoj programim.",
      "Fillo me bazat e JavaScript."
    ]);
  });

  test("ruan historikun pas disa cikleve ruajtje dhe rikthimi", async () => {
    const {
      filePath,
      persistence
    } = await createTestEnvironment();

    const sessionId = "json-round-trip-session";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazhi i parë."
    });

    expect(
      (await persistence.saveSession(sessionId)).success
    ).toBe(true);

    deleteMemorySession(sessionId);

    const secondPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus-json-test:"
    });

    expect(
      (await secondPersistence.restoreSession(sessionId)).success
    ).toBe(true);

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Përgjigjja e parë."
    });

    expect(
      (await secondPersistence.saveSession(sessionId)).success
    ).toBe(true);

    deleteMemorySession(sessionId);

    const thirdPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus-json-test:"
    });

    expect(
      (await thirdPersistence.restoreSession(sessionId)).success
    ).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history.map(message => message.content)).toEqual([
      "Mesazhi i parë.",
      "Përgjigjja e parë."
    ]);
  });

  test("izolon sesionet e ndryshme në të njëjtin skedar JSON", async () => {
    const {
      filePath,
      persistence
    } = await createTestEnvironment();

    const firstId = "json-session-A";
    const secondId = "json-session-B";

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
      content: "Vetëm për sesionin A."
    });

    addMemoryMessage({
      sessionId: secondId,
      role: "user",
      content: "Only for session B."
    });

    await persistence.saveSession(firstId);
    await persistence.saveSession(secondId);

    clearAllMemory();

    const recoveredPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus-json-test:"
    });

    expect(
      (await recoveredPersistence.restoreSession(firstId)).success
    ).toBe(true);

    expect(
      (await recoveredPersistence.restoreSession(secondId)).success
    ).toBe(true);

    expect(getMemoryHistory(firstId).map(m => m.content)).toEqual([
      "Vetëm për sesionin A."
    ]);

    expect(getMemoryHistory(secondId).map(m => m.content)).toEqual([
      "Only for session B."
    ]);
  });

  test("nuk rikthen një sesion që nuk ekziston në storage", async () => {
    const { persistence } = await createTestEnvironment();

    const sessionId = "json-missing-session";

    const result = await persistence.restoreSession(sessionId);

    expect(result.success).toBe(false);
    expect(hasMemorySession(sessionId)).toBe(false);
  });

  test("fshin të dhënat e sesionit nga storage përmes API-së së persistence", async () => {
    const {
      filePath,
      persistence
    } = await createTestEnvironment();

    const sessionId = "json-delete-session";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Ky sesion duhet të fshihet."
    });

    expect(
      (await persistence.saveSession(sessionId)).success
    ).toBe(true);

    const deleted = await persistence.deleteSavedSession(sessionId);

    expect(deleted.success).toBe(true);

    const newPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus-json-test:"
    });

    const restored = await newPersistence.restoreSession(sessionId);

    expect(restored.success).toBe(false);
  });
});
