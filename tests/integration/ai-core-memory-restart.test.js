
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { processAIRequest, configureAICoreMemoryPersistence } from "../../src/core/ai-core.js";

import {
  createMemorySession,
  clearAllMemory,
  getMemoryHistory,
} from "../../src/core/memory-engine.js";

import { createMemoryPersistence } from "../../src/core/memory-persistence-integration.js";

import { createJSONMemoryStorage } from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — JSON memory recovery", () => {
  let tempDirectory;

  afterEach(async () => {
    configureAICoreMemoryPersistence(null);
    clearAllMemory();

    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  test("rikthen historikun e ruajtur përmes një instance të re persistence", async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), "xsus-ai-memory-"));
    const filePath = join(tempDirectory, "memory.json");
    const sessionId = "restart-integration-session";

    const firstPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:test:"
    });

    configureAICoreMemoryPersistence(firstPersistence);

    createMemorySession({
      sessionId,
      metadata: { language: "sq" }
    });

    const firstRequest = await processAIRequest({
      query: "Dua të ndërtoj një aplikacion AI.",
      conversationId: sessionId,
      language: "sq"
    });

    expect(firstRequest).toBeDefined();
    expect(firstRequest.error).toBeUndefined();

    const historyBeforeRestart = getMemoryHistory(sessionId);
    expect(historyBeforeRestart.length).toBeGreaterThan(0);

    // Simulo humbjen e memories aktive, duke ruajtur skedarin JSON.
    clearAllMemory();

    expect(getMemoryHistory(sessionId)).toHaveLength(0);

    // Krijo instancë të re që lexon të njëjtin skedar JSON.
    const secondPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:test:"
    });

    configureAICoreMemoryPersistence(secondPersistence);

    const secondRequest = await processAIRequest({
      query: "Vazhdo me planin e aplikacionit.",
      conversationId: sessionId,
      language: "sq"
    });

    expect(secondRequest).toBeDefined();
    expect(secondRequest.error).toBeUndefined();

    const recoveredHistory = getMemoryHistory(sessionId);

    expect(recoveredHistory.length).toBeGreaterThan(
      historyBeforeRestart.length
    );

    expect(
      recoveredHistory.some(
        (message) =>
          message.content === "Dua të ndërtoj një aplikacion AI."
      )
    ).toBe(true);

    expect(
      recoveredHistory.some(
        (message) =>
          message.content === "Vazhdo me planin e aplikacionit."
      )
    ).toBe(true);
  });
});
