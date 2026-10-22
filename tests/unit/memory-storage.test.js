
import { beforeEach, describe, expect, test } from "vitest";

import {
  MEMORY_STORAGE_VERSION,
  createMemoryStorageAdapter,
} from "../../src/core/memory-storage.js";

describe("XSUS AI Memory Storage Adapter", () => {
  let storage;

  beforeEach(() => {
    storage = createMemoryStorageAdapter();
  });

  test("ekspozon versionin e storage", () => {
    expect(MEMORY_STORAGE_VERSION).toBe("1.0.0");
  });

  test("krijon adapterin me metodat e pritshme", () => {
    expect(typeof storage.get).toBe("function");
    expect(typeof storage.set).toBe("function");
    expect(typeof storage.delete).toBe("function");
    expect(typeof storage.has).toBe("function");
    expect(typeof storage.keys).toBe("function");
    expect(typeof storage.clear).toBe("function");
    expect(typeof storage.getStats).toBe("function");
  });

  test("ruan dhe lexon të dhëna", async () => {
    const value = {
      sessionId: "session-1",
      messages: [
        {
          role: "user",
          content: "Përshëndetje",
        },
      ],
    };

    const result = await storage.set("session-1", value);

    expect(result).toEqual({
      saved: true,
      key: "session-1",
    });

    expect(await storage.get("session-1")).toEqual(value);
  });

  test("kthen null për çelës që nuk ekziston", async () => {
    expect(await storage.get("missing")).toBeNull();
  });

  test("normalizon hapësirat në çelësa", async () => {
    await storage.set(" session-1 ", { language: "sq" });

    expect(await storage.get("session-1")).toEqual({
      language: "sq",
    });

    expect(await storage.has(" session-1 ")).toBe(true);
  });

  test("refuzon çelës bosh ose të pavlefshëm", async () => {
    await expect(storage.get("")).rejects.toThrow(
      "Çelësi i memories"
    );

    await expect(storage.set("   ", {})).rejects.toThrow(
      "Çelësi i memories"
    );

    await expect(storage.has(null)).rejects.toThrow(
      "Çelësi i memories"
    );

    await expect(storage.delete(undefined)).rejects.toThrow(
      "Çelësi i memories"
    );
  });

  test("izolon të dhënat nga objekti origjinal", async () => {
    const value = {
      metadata: {
        language: "sq",
        preferences: {
          theme: "dark",
        },
      },
    };

    await storage.set("session-1", value);

    value.metadata.language = "en";
    value.metadata.preferences.theme = "light";

    expect(await storage.get("session-1")).toEqual({
      metadata: {
        language: "sq",
        preferences: {
          theme: "dark",
        },
      },
    });
  });

  test("kthen kopje të pavarur gjatë leximit", async () => {
    await storage.set("session-1", {
      metadata: { language: "sq" },
    });

    const value = await storage.get("session-1");
    value.metadata.language = "fr";

    expect(await storage.get("session-1")).toEqual({
      metadata: { language: "sq" },
    });
  });

  test("mbështet përditësimin e një çelësi ekzistues", async () => {
    await storage.set("session-1", { language: "sq" });
    await storage.set("session-1", { language: "en" });

    expect(await storage.get("session-1")).toEqual({
      language: "en",
    });

    expect((await storage.getStats()).entries).toBe(1);
  });

  test("refuzon vlera që nuk serializohen në JSON", async () => {
    const circular = {};
    circular.self = circular;

    await expect(
      storage.set("circular", circular)
    ).rejects.toThrow("nuk mund të serializohen");
  });

  test("refuzon undefined si vlerë të nivelit kryesor", async () => {
    await expect(
      storage.set("undefined-value", undefined)
    ).rejects.toThrow("të vlefshme për JSON");
  });

  test("ruan null si vlerë të vlefshme", async () => {
    await storage.set("nullable", null);

    expect(await storage.has("nullable")).toBe(true);
    expect(await storage.get("nullable")).toBeNull();
    expect((await storage.getStats()).entries).toBe(1);
  });

  test("kontrollon nëse çelësi ekziston", async () => {
    expect(await storage.has("session-1")).toBe(false);

    await storage.set("session-1", { active: true });

    expect(await storage.has("session-1")).toBe(true);
  });

  test("liston çelësat e ruajtur", async () => {
    await storage.set("session-1", {});
    await storage.set("session-2", {});
    await storage.set("session-3", {});

    expect(await storage.keys()).toEqual([
      "session-1",
      "session-2",
      "session-3",
    ]);
  });

  test("fshin një hyrje ekzistuese", async () => {
    await storage.set("session-1", { active: true });

    expect(await storage.delete("session-1")).toEqual({
      deleted: true,
      key: "session-1",
    });

    expect(await storage.has("session-1")).toBe(false);
  });

  test("raporton kur çelësi që fshihet nuk ekziston", async () => {
    expect(await storage.delete("missing")).toEqual({
      deleted: false,
      key: "missing",
    });
  });

  test("pastron të gjitha hyrjet", async () => {
    await storage.set("session-1", {});
    await storage.set("session-2", {});

    expect(await storage.clear()).toEqual({
      cleared: true,
      removedEntries: 2,
    });

    expect(await storage.keys()).toEqual([]);
    expect((await storage.getStats()).entries).toBe(0);
  });

  test("kthen statistikat e storage", async () => {
    await storage.set("session-1", {});
    await storage.set("session-2", {});

    expect(await storage.getStats()).toEqual({
      version: "1.0.0",
      entries: 2,
      adapter: "memory",
    });
  });

  test("refuzon opsione të pavlefshme", () => {
    expect(() => createMemoryStorageAdapter(null)).toThrow(
      "Opsionet e storage adapter"
    );

    expect(() => createMemoryStorageAdapter([])).toThrow(
      "Opsionet e storage adapter"
    );
  });

  test("adapterët kanë storage të izoluar", async () => {
    const anotherStorage = createMemoryStorageAdapter();

    await storage.set("session-1", { language: "sq" });

    expect(await anotherStorage.get("session-1")).toBeNull();
    expect(await storage.get("session-1")).toEqual({
      language: "sq",
    });
  });
});
