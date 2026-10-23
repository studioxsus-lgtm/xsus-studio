
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createJSONMemoryStorage
} from "../../src/core/json-memory-storage.js";

import {
  createMemoryPersistence
} from "../../src/core/memory-persistence-integration.js";

import {
  createMemorySession,
  addMemoryMessage,
  getMemoryHistory,
  hasMemorySession,
  deleteMemorySession,
  clearAllMemory
} from "../../src/core/memory-engine.js";

describe("XSUS AI Core — JSON Memory Integration", () => {
  let temporaryDirectory;

  afterEach(async () => {
    clearAllMemory();

    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true
      });

      temporaryDirectory = undefined;
    }
  });

  async function createTestPersistence() {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-ai-memory-")
    );

    const filePath = path.join(
      temporaryDirectory,
      "memory.json"
    );

    const storage = createJSONMemoryStorage({ filePath });

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus-integration:"
    });

    return { storage, persistence, filePath };
  }

  test("ruan dhe rikthen historikun nga skedari JSON", async () => {
    const { persistence, filePath } =
      await createTestPersistence();

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
      content: "Mund të fillosh me JavaScript."
    });

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);

    const fileContent = await readFile(filePath, "utf8");
    expect(fileContent).toContain("Dua të mësoj programim.");

    deleteMemorySession(sessionId);

    expect(hasMemorySession(sessionId)).toBe(false);

    const restored = await persistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history.map(message => message.content)).toEqual([
      "Dua të mësoj programim.",
      "Mund të fillosh me JavaScript."
    ]);
  });

  test("instanca e re e storage rikthen të dhënat e ruajtura", async () => {
    const { filePath, persistence } =
      await createTestPersistence();

    const sessionId = "json-restart-session";

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Ruaje këtë bisedë."
    });

    const saved = await persistence.saveSession(sessionId);
    expect(saved.success).toBe(true);

    clearAllMemory();

    const newStorage = createJSONMemoryStorage({ filePath });

    const newPersistence = createMemoryPersistence({
      storage: newStorage,
      prefix: "xsus-integration:"
    });

    const restored = await newPersistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(getMemoryHistory(sessionId)).toHaveLength(1);
    expect(getMemoryHistory(sessionId)[0].content).toBe(
      "Ruaje këtë bisedë."
    );
  });

  test("sesionet e ndryshme mbeten të izoluara në JSON", async () => {
    const { persistence, storage } =
      await createTestPersistence();

    createMemorySession({
      sessionId: "json-session-A",
      language: "sq"
    });

    createMemorySession({
      sessionId: "json-session-B",
      language: "en"
    });

    addMemoryMessage({
      sessionId: "json-session-A",
      role: "user",
      content: "Vetëm A."
    });

    addMemoryMessage({
      sessionId: "json-session-B",
      role: "user",
      content: "Only B."
    });

    expect(
      (await persistence.saveSession("json-session-A")).success
    ).toBe(true);

    expect(
      (await persistence.saveSession("json-session-B")).success
    ).toBe(true);

    deleteMemorySession("json-session-A");

    const restored = await persistence.restoreSession(
      "json-session-A"
    );

    expect(restored.success).toBe(true);

    expect(getMemoryHistory("json-session-A")[0].content).toBe(
      "Vetëm A."
    );

    expect(getMemoryHistory("json-session-B")[0].content).toBe(
      "Only B."
    );

    expect(await storage.has("xsus-integration:json-session-A"))
      .toBe(true);

    expect(await storage.has("xsus-integration:json-session-B"))
      .toBe(true);
  });
});
