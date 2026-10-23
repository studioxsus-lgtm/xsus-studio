
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createMemorySession,
  addMemoryMessage,
  getMemoryHistory,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

import {
  createMemoryPersistence,
} from "../../src/core/memory-persistence-integration.js";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("JSON memory persistence — restart recovery", () => {
  let tempDirectory;

  afterEach(async () => {
    clearAllMemory();

    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });

      tempDirectory = undefined;
    }
  });

  test("ruan dhe rikthen historikun përmes instancave të reja", async () => {
    tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-memory-")
    );

    const filePath = path.join(
      tempDirectory,
      "memory.json"
    );

    const sessionId = "restart-recovery-test";

    // Simulohet sesioni para rinisjes.
    createMemorySession({
      sessionId,
      metadata: { source: "restart-test" },
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Përshëndetje XSUS AI",
    });

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    const firstPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
    });

    const saveResult =
      await firstPersistence.saveSession(sessionId);

    expect(saveResult.success).toBe(true);

    // Simulohet rinisja: pastrohet RAM-i.
    clearAllMemory();

    // Krijohet një storage dhe persistence i ri.
    const secondPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
    });

    const restoreResult =
      await secondPersistence.restoreSession(sessionId);

    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restored).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe(
      "Përshëndetje XSUS AI"
    );
    expect(history[1].role).toBe("assistant");
    expect(history[1].content).toBe(
      "Përshëndetje! Si mund të të ndihmoj?"
    );
  });
});
