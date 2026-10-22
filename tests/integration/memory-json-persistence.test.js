
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createJSONMemoryStorage
} from "../../src/core/json-memory-storage.js";

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

describe("XSUS AI Core — JSON Persistent Memory", () => {
  let temporaryDirectories = [];

  async function createTemporaryFilePath() {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-memory-test-")
    );

    temporaryDirectories.push(directory);

    return path.join(directory, "memory.json");
  }

  function createPersistence(filePath) {
    return createMemoryPersistence({
      storage: createJSONMemoryStorage({ filePath }),
      prefix: "xsus-json-test:"
    });
  }

  afterEach(async () => {
    clearAllMemory();

    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    temporaryDirectories = [];
  });

  test("ruan të dhënat në JSON dhe i lexon nga instancë e re", async () => {
    const filePath = await createTemporaryFilePath();

    const firstStorage = createJSONMemoryStorage({ filePath });

    await firstStorage.set("session-1", {
      sessionId: "session-1",
      messages: [
        {
          id: "message-1",
          role: "user",
          content: "Përshëndetje XSUS AI."
        }
      ]
    });

    const secondStorage = createJSONMemoryStorage({ filePath });

    const restored = await secondStorage.get("session-1");

    expect(restored).toEqual({
      sessionId: "session-1",
      messages: [
        {
          id: "message-1",
          role: "user",
          content: "Përshëndetje XSUS AI."
        }
      ]
    });
  });

  test("ruan dhe rikthen historikun e sesionit përmes integrimit", async () => {
    const filePath = await createTemporaryFilePath();
    const sessionId = "json-recovery-session";

    const firstPersistence = createPersistence(filePath);

    createMemorySession({
      sessionId,
      language: "sq"
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Dua të testoj ruajtjen në disk."
    });

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Memoria JSON është gati për testim."
    });

    const saved = await firstPersistence.saveSession(sessionId);

    expect(saved.success).toBe(true);

    const fileContent = await readFile(filePath, "utf8");
    expect(() => JSON.parse(fileContent)).not.toThrow();

    deleteMemorySession(sessionId);
    expect(hasMemorySession(sessionId)).toBe(false);

    const secondPersistence = createPersistence(filePath);
    const restored = await secondPersistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history.map((message) => message.content)).toEqual([
      "Dua të testoj ruajtjen në disk.",
      "Memoria JSON është gati për testim."
    ]);
  });

  test("izolon çelësat e sesioneve në skedarin JSON", async () => {
    const filePath = await createTemporaryFilePath();
    const storage = createJSONMemoryStorage({ filePath });

    await storage.set("session-A", {
      sessionId: "session-A",
      content: "Biseda A"
    });

    await storage.set("session-B", {
      sessionId: "session-B",
      content: "Biseda B"
    });

    expect(await storage.keys()).toEqual(
      expect.arrayContaining(["session-A", "session-B"])
    );

    expect(await storage.get("session-A")).toEqual({
      sessionId: "session-A",
      content: "Biseda A"
    });

    expect(await storage.get("session-B")).toEqual({
      sessionId: "session-B",
      content: "Biseda B"
    });

    await storage.delete("session-A");

    expect(await storage.has("session-A")).toBe(false);
    expect(await storage.has("session-B")).toBe(true);
  });

  test("refuzon skedar JSON të dëmtuar", async () => {
    const filePath = await createTemporaryFilePath();

    await writeFile(filePath, "{ invalid-json", "utf8");

    const storage = createJSONMemoryStorage({ filePath });

    await expect(storage.get("session-1")).rejects.toThrow(
      "Skedari i memories përmban JSON të pavlefshëm."
    );
  });

  test("ruan kopje të izoluara të të dhënave", async () => {
    const filePath = await createTemporaryFilePath();
    const storage = createJSONMemoryStorage({ filePath });

    const original = {
      messages: [
        {
          role: "user",
          content: "Teksti fillestar"
        }
      ]
    };

    await storage.set("session-1", original);

    original.messages[0].content = "Tekst i ndryshuar";

    const restored = await storage.get("session-1");

    expect(restored.messages[0].content).toBe("Teksti fillestar");

    restored.messages[0].content = "Ndryshim jashtë storage-it";

    const restoredAgain = await storage.get("session-1");

    expect(restoredAgain.messages[0].content).toBe(
      "Teksti fillestar"
    );
  });

  test("kthen statistikat e storage-it JSON", async () => {
    const filePath = await createTemporaryFilePath();
    const storage = createJSONMemoryStorage({ filePath });

    await storage.set("session-1", { content: "Test" });

    const stats = await storage.getStats();

    expect(stats.adapter).toBe("json-file");
    expect(stats.entries).toBe(1);
    expect(stats.filePath).toBe(path.resolve(filePath));
  });
});
