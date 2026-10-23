
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  configureAICoreMemoryPersistence,
  processAIRequest,
} from "../../src/core/ai-core.js";

import {
  clearAllMemory,
  getMemoryHistory,
} from "../../src/core/memory-engine.js";

import {
  createMemoryPersistence,
} from "../../src/core/memory-persistence-integration.js";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — Duplicate memory recovery", () => {
  let tempDirectory;

  afterEach(async () => {
    configureAICoreMemoryPersistence(null);
    clearAllMemory();

    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
      tempDirectory = undefined;
    }
  });

  test("nuk dyfishon mesazhet kur vazhdon sesioni i rikuperuar", async () => {
    tempDirectory = await mkdtemp(
      join(tmpdir(), "xsus-ai-duplicate-")
    );

    const filePath = join(tempDirectory, "memory.json");
    const sessionId = "duplicate-recovery-session";

    const firstPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:duplicate:",
    });

    configureAICoreMemoryPersistence(firstPersistence);

    const firstResult = await processAIRequest({
      query: "Mesazhi fillestar i sesionit.",
      conversationId: sessionId,
      language: "sq",
    });

    expect(firstResult.error).toBeUndefined();

    const originalHistory = getMemoryHistory(sessionId);
    expect(originalHistory.length).toBeGreaterThan(0);

    const originalUserMessageCount = originalHistory.filter(
      (message) =>
        message.role === "user" &&
        message.content === "Mesazhi fillestar i sesionit."
    ).length;

    expect(originalUserMessageCount).toBe(1);

    clearAllMemory();

    const secondPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:duplicate:",
    });

    configureAICoreMemoryPersistence(secondPersistence);

    const secondResult = await processAIRequest({
      query: "Mesazhi vijues i sesionit.",
      conversationId: sessionId,
      language: "sq",
    });

    expect(secondResult.error).toBeUndefined();

    const recoveredHistory = getMemoryHistory(sessionId);

    const firstMessageCount = recoveredHistory.filter(
      (message) =>
        message.role === "user" &&
        message.content === "Mesazhi fillestar i sesionit."
    ).length;

    const secondMessageCount = recoveredHistory.filter(
      (message) =>
        message.role === "user" &&
        message.content === "Mesazhi vijues i sesionit."
    ).length;

    expect(firstMessageCount).toBe(1);
    expect(secondMessageCount).toBe(1);
  });
});
