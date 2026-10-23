
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createMemorySession,
  addMemoryMessage,
  getMemoryHistory,
  hasMemorySession,
  clearAllMemory
} from "../../src/core/memory-engine.js";

import { createMemoryPersistence } from "../../src/core/memory-persistence-integration.js";
import { createJSONMemoryStorage } from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — JSON memory recovery", () => {
  let temporaryDirectory;
  let filePath;

  const sessionId = "xsus-ai-core-restart-session";
  const prefix = "xsus-ai-core-restart-test:";

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-ai-memory-")
    );

    filePath = path.join(temporaryDirectory, "memory.json");

    clearAllMemory();
  });

  afterEach(async () => {
    clearAllMemory();

    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true
      });
    }
  });

  test("rikthen historikun nga JSON pasi memoria RAM pastrohet", async () => {
    const firstStorage = createJSONMemoryStorage({ filePath });
    const firstPersistence = createMemoryPersistence({
      storage: firstStorage,
      filePath,
      prefix
    });

    createMemorySession(sessionId, "sq");

    addMemoryMessage(sessionId, {
      role: "user",
      content: "Dua të ndërtoj një aplikacion AI."
    });

    addMemoryMessage(sessionId, {
      role: "assistant",
      content: "Fillo me arkitekturën e bërthamës."
    });

    await firstPersistence.saveSession(sessionId);

    expect(hasMemorySession(sessionId)).toBe(true);

    clearAllMemory();

    expect(hasMemorySession(sessionId)).toBe(false);

    const secondStorage = createJSONMemoryStorage({ filePath });
    const secondPersistence = createMemoryPersistence({
      storage: secondStorage,
      filePath,
      prefix
    });

    const restored = await secondPersistence.restoreSession(sessionId);

    expect(restored).toBeTruthy();
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(
      expect.objectContaining({
        role: "user",
        content: "Dua të ndërtoj një aplikacion AI."
      })
    );

    expect(history[1]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Fillo me arkitekturën e bërthamës."
      })
    );
  });
});
