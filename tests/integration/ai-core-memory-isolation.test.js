
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  processAIRequest,
  configureAICoreMemoryPersistence,
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

describe("XSUS AI Core — Memory isolation after recovery", () => {
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

  test("rikuperon një sesion pa përzier historikun e një sesioni tjetër", async () => {
    tempDirectory = await mkdtemp(
      join(tmpdir(), "xsus-ai-isolation-")
    );

    const filePath = join(tempDirectory, "memory.json");

    const persistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:isolation:",
    });

    configureAICoreMemoryPersistence(persistence);

    const sessionA = "isolation-session-A";
    const sessionB = "isolation-session-B";

    const firstA = await processAIRequest({
      query: "Ky është informacioni privat i sesionit A.",
      conversationId: sessionA,
      language: "sq",
    });

    expect(firstA.error).toBeUndefined();

    const firstB = await processAIRequest({
      query: "Ky është informacioni privat i sesionit B.",
      conversationId: sessionB,
      language: "sq",
    });

    expect(firstB.error).toBeUndefined();

    const historyA = getMemoryHistory(sessionA);
    const historyB = getMemoryHistory(sessionB);

    expect(
      historyA.some((message) =>
        message.content.includes("sesionit A")
      )
    ).toBe(true);

    expect(
      historyB.some((message) =>
        message.content.includes("sesionit B")
      )
    ).toBe(true);

    clearAllMemory();

    expect(getMemoryHistory(sessionA)).toHaveLength(0);
    expect(getMemoryHistory(sessionB)).toHaveLength(0);

    // Rikuperojmë vetëm sesionin A.
    const recoveredPersistence = createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus:isolation:",
    });

    configureAICoreMemoryPersistence(recoveredPersistence);

    const secondA = await processAIRequest({
      query: "Vazhdo sesionin A.",
      conversationId: sessionA,
      language: "sq",
    });

    expect(secondA.error).toBeUndefined();

    const recoveredA = getMemoryHistory(sessionA);
    const untouchedB = getMemoryHistory(sessionB);

    expect(
      recoveredA.some((message) =>
        message.content.includes("informacioni privat i sesionit A")
      )
    ).toBe(true);

    expect(
      recoveredA.some((message) =>
        message.content.includes("informacioni privat i sesionit B")
      )
    ).toBe(false);

    // Sesioni B nuk duhet të krijohet automatikisht
    // vetëm sepse ekziston në skedarin JSON.
    expect(untouchedB).toHaveLength(0);
  });
});
