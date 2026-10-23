
/**
 * XSUS AI Core — JSON Memory Storage Integration Tests
 * Version: 1.0.0
 *
 * Verifikon ruajtjen reale në disk dhe leximin
 * e të dhënave nga instanca të reja të storage-it.
 */

import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  createJSONMemoryStorage,
} from "../../src/core/memory-json-storage.js";

describe("XSUS AI Core - JSON Memory Storage", () => {
  let directory;

  afterEach(async () => {
    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true,
      });

      directory = undefined;
    }
  });

  async function setup() {
    directory = await mkdtemp(
      join(tmpdir(), "xsus-json-memory-")
    );

    const filePath = join(directory, "memory.json");

    return {
      filePath,
      storage: createJSONMemoryStorage({ filePath }),
    };
  }

  test("ruan të dhënat në një skedar JSON real", async () => {
    const { filePath, storage } = await setup();

    const sessionId = `session-${randomUUID()}`;

    const snapshot = {
      sessionId,
      messages: [
        {
          role: "user",
          content: "Përshëndetje XSUS AI",
        },
        {
          role: "assistant",
          content: "Përshëndetje!",
        },
      ],
    };

    const result = await storage.set(sessionId, snapshot);

    expect(result).toEqual({
      saved: true,
      key: sessionId,
    });

    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent);

    expect(parsed[sessionId]).toEqual(snapshot);
  });

  test("ruan të dhënat pas krijimit të një instance të re", async () => {
    const { filePath, storage } = await setup();

    const sessionId = `session-${randomUUID()}`;

    const snapshot = {
      sessionId,
      messages: [
        {
          role: "user",
          content: "Mesazhi i parë",
        },
        {
          role: "assistant",
          content: "Përgjigjja e parë",
        },
        {
          role: "user",
          content: "Mesazhi i dytë",
        },
      ],
    };

    await storage.set(sessionId, snapshot);

    // Simulojmë hapjen e një instance të re të storage-it.
    const reopenedStorage = createJSONMemoryStorage({
      filePath,
    });

    const restored = await reopenedStorage.get(sessionId);

    expect(restored).toEqual(snapshot);
    expect(restored.messages).toHaveLength(3);
    expect(restored.messages[0].content).toBe(
      "Mesazhi i parë"
    );
    expect(restored.messages[1].content).toBe(
      "Përgjigjja e parë"
    );
    expect(restored.messages[2].content).toBe(
      "Mesazhi i dytë"
    );
  });

  test("kthen null kur çelësi nuk ekziston", async () => {
    const { storage } = await setup();

    const result = await storage.get("missing-session");

    expect(result).toBeNull();
  });

  test("ruan dhe verifikon çelësat e memories", async () => {
    const { storage } = await setup();

    const firstKey = `session-${randomUUID()}`;
    const secondKey = `session-${randomUUID()}`;

    await storage.set(firstKey, {
      messages: [],
    });

    await storage.set(secondKey, {
      messages: [],
    });

    expect(await storage.has(firstKey)).toBe(true);
    expect(await storage.has(secondKey)).toBe(true);

    const keys = await storage.keys();

    expect(keys).toContain(firstKey);
    expect(keys).toContain(secondKey);

    const stats = await storage.getStats();

    expect(stats.adapter).toBe("json-file");
    expect(stats.entries).toBe(2);
    expect(stats.version).toBe("1.0.0");
  });

  test("fshin një hyrje pa prekur hyrjet e tjera", async () => {
    const { storage } = await setup();

    const firstKey = `session-${randomUUID()}`;
    const secondKey = `session-${randomUUID()}`;

    await storage.set(firstKey, {
      value: "Të dhënat e para",
    });

    await storage.set(secondKey, {
      value: "Të dhënat e dyta",
    });

    const result = await storage.delete(firstKey);

    expect(result.deleted).toBe(true);
    expect(await storage.has(firstKey)).toBe(false);
    expect(await storage.get(secondKey)).toEqual({
      value: "Të dhënat e dyta",
    });
  });

  test("refuzon një skedar që përmban JSON të pavlefshëm", async () => {
    const { filePath, storage } = await setup();

    // Krijojmë skedarin e dëmtuar qëllimisht.
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(filePath, "{ JSON i pavlefshëm", "utf8")
    );

    await expect(
      storage.get("session-test")
    ).rejects.toThrow(
      "Skedari i memories përmban JSON të pavlefshëm."
    );
  });
});
