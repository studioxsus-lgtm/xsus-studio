
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI Core — JSON Storage Concurrency", () => {
  let tempDirectory;

  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });

      tempDirectory = undefined;
    }
  });

  test("ruan të dy çelësat kur dy instanca shkruajnë paralelisht", async () => {
    tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-concurrency-")
    );

    const filePath = path.join(
      tempDirectory,
      "memory.json"
    );

    const storageA = createJSONMemoryStorage({ filePath });
    const storageB = createJSONMemoryStorage({ filePath });

    await Promise.all([
      storageA.set("session:a", { value: "A" }),
      storageB.set("session:b", { value: "B" }),
    ]);

    const verifier = createJSONMemoryStorage({ filePath });

    const [valueA, valueB] = await Promise.all([
      verifier.get("session:a"),
      verifier.get("session:b"),
    ]);

    expect(valueA).toEqual({ value: "A" });
    expect(valueB).toEqual({ value: "B" });
  });
});
