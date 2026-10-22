
/**
 * XSUS AI Core — JSON Memory Storage
 * Version: 1.0.0
 *
 * Ruajtje e qëndrueshme e memories në skedar JSON.
 * Përdor Node.js filesystem API.
 */

import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

export const JSON_MEMORY_STORAGE_VERSION = "1.0.0";

function normalizeKey(key) {
  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Çelësi i memories duhet të jetë tekst jo bosh.");
  }

  return key.trim();
}

function cloneJSON(value) {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(
      "Të dhënat e memories nuk mund të serializohen në JSON."
    );
  }

  if (serialized === undefined) {
    throw new Error(
      "Të dhënat e memories duhet të jenë të vlefshme për JSON."
    );
  }

  return JSON.parse(serialized);
}

function validateStore(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("Struktura e skedarit të memories është e pavlefshme.");
  }

  for (const key of Object.keys(value)) {
    normalizeKey(key);
  }

  return cloneJSON(value);
}

export function createJSONMemoryStorage(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Opsionet e JSON storage janë të pavlefshme.");
  }

  const filePath =
    typeof options.filePath === "string" && options.filePath.trim()
      ? path.resolve(options.filePath.trim())
      : path.resolve("data/xsus-memory.json");

  let queue = Promise.resolve();

  async function ensureDirectory() {
    await mkdir(path.dirname(filePath), { recursive: true });
  }

  async function readStore() {
    try {
      const content = await readFile(filePath, "utf8");
      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error(
          "Skedari i memories përmban JSON të pavlefshëm."
        );
      }

      return validateStore(parsed);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }

      throw error;
    }
  }

  async function writeStore(store) {
    await ensureDirectory();

    const temporaryPath =
      `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
      await writeFile(
        temporaryPath,
        JSON.stringify(store, null, 2),
        "utf8"
      );

      await rename(temporaryPath, filePath);
    } catch (error) {
      const { unlink } = await import("node:fs/promises");

      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  function serialize(operation) {
    const result = queue.then(operation);

    queue = result.catch(() => {});

    return result;
  }

  async function get(key) {
    const normalizedKey = normalizeKey(key);

    return serialize(async () => {
      const store = await readStore();

      if (!Object.prototype.hasOwnProperty.call(store, normalizedKey)) {
        return null;
      }

      return cloneJSON(store[normalizedKey]);
    });
  }

  async function set(key, value) {
    const normalizedKey = normalizeKey(key);
    const clonedValue = cloneJSON(value);

    return serialize(async () => {
      const store = await readStore();

      store[normalizedKey] = clonedValue;

      await writeStore(store);

      return {
        saved: true,
        key: normalizedKey,
      };
    });
  }

  async function remove(key) {
    const normalizedKey = normalizeKey(key);

    return serialize(async () => {
      const store = await readStore();
      const deleted = Object.prototype.hasOwnProperty.call(
        store,
        normalizedKey
      );

      if (deleted) {
        delete store[normalizedKey];
        await writeStore(store);
      }

      return {
        deleted,
        key: normalizedKey,
      };
    });
  }

  async function has(key) {
    const normalizedKey = normalizeKey(key);

    return serialize(async () => {
      const store = await readStore();

      return Object.prototype.hasOwnProperty.call(
        store,
        normalizedKey
      );
    });
  }

  async function keys() {
    return serialize(async () => {
      const store = await readStore();
      return Object.keys(store);
    });
  }

  async function clear() {
    return serialize(async () => {
      const store = await readStore();
      const removedEntries = Object.keys(store).length;

      await writeStore({});

      return {
        cleared: true,
        removedEntries,
      };
    });
  }

  async function getStats() {
    return serialize(async () => {
      const store = await readStore();

      return {
        version: JSON_MEMORY_STORAGE_VERSION,
        entries: Object.keys(store).length,
        adapter: "json-file",
        filePath,
      };
    });
  }

  return Object.freeze({
    get,
    set,
    delete: remove,
    has,
    keys,
    clear,
    getStats,
  });
}
