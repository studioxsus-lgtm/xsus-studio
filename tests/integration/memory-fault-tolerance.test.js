
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createJSONMemoryStorage
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — Memory Fault Tolerance", () => {
  let temporaryDirectories = [];

  async function createTemporaryDirectory() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-memory-fault-")
    );

    temporaryDirectories.push(directory);

    return directory;
  }

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, {
          recursive: true,
          force: true
        })
      )
    );

    temporaryDirectories = [];
  });

  test("rikthen gabim të kontrollueshëm kur JSON është i dëmtuar", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "corrupted.json");

    await writeFile(
      filePath,
      '{"broken": ',
      "utf8"
    );

    const storage = createJSONMemoryStorage({ filePath });

    await expect(
      storage.get("session-1")
    ).rejects.toThrow();
  });

  test("nuk e ngatërron një direktori me skedarin JSON", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory-directory");

    await mkdir(filePath);

    const storage = createJSONMemoryStorage({ filePath });

    await expect(
      storage.get("session-1")
    ).rejects.toThrow();
  });

  test("ruan të dhënat pas disa shkrimeve të njëpasnjëshme", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });

    await Promise.all([
      storage.set("session-A", { message: "Mesazhi A" }),
      storage.set("session-B", { message: "Mesazhi B" }),
      storage.set("session-C", { message: "Mesazhi C" })
    ]);

    await expect(
      storage.get("session-A")
    ).resolves.toEqual({ message: "Mesazhi A" });

    await expect(
      storage.get("session-B")
    ).resolves.toEqual({ message: "Mesazhi B" });

    await expect(
      storage.get("session-C")
    ).resolves.toEqual({ message: "Mesazhi C" });
  });

  test("mund të lexojë të dhënat pas krijimit të një instance të re", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const firstStorage = createJSONMemoryStorage({ filePath });

    await firstStorage.set("recovery-check", {
      version: 1,
      content: "XSUS AI"
    });

    const secondStorage = createJSONMemoryStorage({ filePath });

    await expect(
      secondStorage.get("recovery-check")
    ).resolves.toEqual({
      version: 1,
      content: "XSUS AI"
    });
  });

  test("nuk lë skedar JSON të pjesshëm pas shkrimit të suksesshëm", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });

    await storage.set("integrity-check", {
      status: "ok"
    });

    const raw = await readFile(filePath, "utf8");

    expect(() => JSON.parse(raw)).not.toThrow();

    const parsed = JSON.parse(raw);

    expect(parsed).toBeTruthy();
    expect(typeof parsed).toBe("object");
  });
});
