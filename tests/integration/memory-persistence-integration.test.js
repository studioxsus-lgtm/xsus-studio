
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createMemorySession,
  addMemoryMessage,
  getMemorySession,
  getMemoryHistory,
  hasMemorySession,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

import {
  createMemoryPersistence,
} from "../../src/core/memory-persistence-integration.js";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Memory Persistence Integration", () => {
  let tempDirectory;
  let persistence;

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

  async function setup() {
    tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-memory-test-")
    );

    const filePath = path.join(
      tempDirectory,
      "memory.json"
    );

    persistence = createMemoryPersistence({ filePath });

    return { filePath };
  }

  test("ruan dhe rikthen një sesion me historikun", async () => {
    await setup();

    createMemorySession("integration-1");

    addMemoryMessage({
      sessionId: "integration-1",
      role: "user",
      content: "Përshëndetje XSUS AI",
    });

    addMemoryMessage({
      sessionId: "integration-1",
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    const saved = await persistence.saveSession(
      "integration-1"
    );

    expect(saved.success).toBe(true);

    clearAllMemory();

    expect(hasMemorySession("integration-1")).toBe(false);

    const restored = await persistence.restoreSession(
      "integration-1"
    );

    expect(restored.restored).toBe(true);
    expect(hasMemorySession("integration-1")).toBe(true);

    const history = getMemoryHistory("integration-1");

    expect(history).toHaveLength(2);
    expect(history[0].content).toBe("Përshëndetje XSUS AI");
    expect(history[1].content).toBe(
      "Përshëndetje! Si mund të të ndihmoj?"
    );
  });

  test("ruan të dhënat në JSON edhe pas krijimit të storage të ri", async () => {
    const { filePath } = await setup();

    createMemorySession("integration-2");

    addMemoryMessage({
      sessionId: "integration-2",
      role: "user",
      content: "Test i ruajtjes në disk",
    });

    await persistence.saveSession("integration-2");

    const newStorage = createJSONMemoryStorage({ filePath });

    const record = await newStorage.get(
      "xsus:memory:session:integration-2"
    );

    expect(record).not.toBeNull();
    expect(record.sessionId).toBe("integration-2");
    expect(record.snapshot.session.messages).toHaveLength(1);
  });

  test("kthen rezultat kur sesioni i ruajtur nuk ekziston", async () => {
    await setup();

    const result = await persistence.restoreSession(
      "missing-integration-session"
    );

    expect(result).toMatchObject({
      success: false,
      restored: false,
      reason: "SESSION_NOT_FOUND",
    });
  });

  test("fshin sesionin e ruajtur dhe atë aktiv", async () => {
    await setup();

    createMemorySession("integration-delete");

    addMemoryMessage({
      sessionId: "integration-delete",
      role: "user",
      content: "Mesazh për fshirje",
    });

    await persistence.saveSession("integration-delete");

    const result = await persistence.deleteSessionCompletely(
      "integration-delete"
    );

    expect(result.success).toBe(true);
    expect(hasMemorySession("integration-delete")).toBe(false);
    expect(
      await persistence.hasSavedSession("integration-delete")
    ).toBe(false);
  });

  test("nuk lejon rikthimin mbi një sesion ekzistues", async () => {
    await setup();

    createMemorySession("integration-duplicate");

    addMemoryMessage({
      sessionId: "integration-duplicate",
      role: "user",
      content: "Mesazhi origjinal",
    });

    await persistence.saveSession("integration-duplicate");

    await expect(
      persistence.restoreSession("integration-duplicate")
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED",
    });

    expect(
      getMemorySession("integration-duplicate").messages[0].content
    ).toBe("Mesazhi origjinal");
  });
});
