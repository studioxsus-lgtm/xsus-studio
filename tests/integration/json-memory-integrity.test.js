
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — JSON Memory Integrity", () => {
  let tempDirectory;

  async function createTestStorage() {
    tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-integrity-")
    );

    const filePath = path.join(
      tempDirectory,
      "memory.json"
    );

    return {
      filePath,
      storage: createJSONMemoryStorage({ filePath }),
    };
  }

  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });

      tempDirectory = undefined;
    }
  });

  test("ruan të dhëna të ndara për çelësa të ndryshëm", async () => {
    const { storage } = await createTestStorage();

    await storage.set("session:a", {
      messages: ["mesazhi A"],
    });

    await storage.set("session:b", {
      messages: ["mesazhi B"],
    });

    expect(await storage.get("session:a")).toEqual({
      messages: ["mesazhi A"],
    });

    expect(await storage.get("session:b")).toEqual({
      messages: ["mesazhi B"],
    });

    expect(await storage.keys()).toHaveLength(2);
  });

  test("nuk ekspozon referenca të ndryshueshme të të dhënave", async () => {
    const { storage } = await createTestStorage();

    const original = {
      messages: ["Përshëndetje"],
    };

    await storage.set("session:clone", original);

    original.messages.push("ndryshim i jashtëm");

    const firstRead = await storage.get("session:clone");

    expect(firstRead.messages).toEqual(["Përshëndetje"]);

    firstRead.messages.push("ndryshim në lexim");

    expect(await storage.get("session:clone")).toEqual({
      messages: ["Përshëndetje"],
    });
  });

  test("raporton gabim kur skedari JSON është i dëmtuar", async () => {
    const { filePath, storage } = await createTestStorage();

    await writeFile(filePath, "{ JSON i pavlefshëm", "utf8");

    await expect(storage.get("session:broken")).rejects.toThrow(
      "Skedari i memories përmban JSON të pavlefshëm."
    );
  });

  test("vazhdon të punojë pas dështimit të një operacioni", async () => {
    const { filePath, storage } = await createTestStorage();

    await writeFile(filePath, "{ JSON i pavlefshëm", "utf8");

    await expect(storage.get("session:broken")).rejects.toThrow();

    // Rikthejmë skedarin në gjendje të vlefshme.
    await writeFile(filePath, "{}", "utf8");

    await expect(
      storage.set("session:recovered", {
        messages: ["Sistemi u rikuperua"],
      })
    ).resolves.toMatchObject({
      saved: true,
      key: "session:recovered",
    });

    expect(await storage.get("session:recovered")).toEqual({
      messages: ["Sistemi u rikuperua"],
    });
  });

  test("fshin vetëm çelësin e kërkuar", async () => {
    const { storage } = await createTestStorage();

    await storage.set("session:a", { value: "A" });
    await storage.set("session:b", { value: "B" });

    await expect(storage.delete("session:a")).resolves.toMatchObject({
      deleted: true,
    });

    expect(await storage.get("session:a")).toBeNull();
    expect(await storage.get("session:b")).toEqual({
      value: "B",
    });
  });

  test("raporton saktë numrin e hyrjeve", async () => {
    const { storage } = await createTestStorage();

    await storage.set("session:a", { value: 1 });
    await storage.set("session:b", { value: 2 });

    await expect(storage.getStats()).resolves.toMatchObject({
      version: "1.0.0",
      entries: 2,
      adapter: "json-file",
    });
  });
});
