
/**
 * XSUS AI Core — JSON Memory Storage
 * Version: 1.0.0
 *
 * Ruajtje e qëndrueshme e memories në skedar JSON.
 * Përdor Node.js filesystem API.
 *
 * Garancitë:
 * - Operacione të serializuara mes instancave në të njëjtin proces.
 * - Emra unikë për skedarët e përkohshëm.
 * - Shkrim atomik përmes skedarit të përkohshëm dhe rename().
 * - Kopjim i të dhënave JSON për të shmangur referencat e jashtme.
 * - Rikuperim i radhës pas dështimit të një operacioni.
 *
 * Kufizim:
 * Nuk siguron kyçje mes proceseve të ndryshme Node.js.
 */

import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";

import { randomUUID } from "node:crypto";
import path from "node:path";

export const JSON_MEMORY_STORAGE_VERSION = "1.0.0";

/**
 * Radhë e përbashkët për çdo rrugë skedari.
 * Koordinon instancat brenda të njëjtit proces Node.js.
 */
const fileQueues = new Map();

function normalizeFilePath(filePath) {
  return path.resolve(filePath);
}

function serializeFileOperation(filePath, operation) {
  const previous = fileQueues.get(filePath) ?? Promise.resolve();

  const result = previous.then(operation);
  const next = result.catch(() => {});

  fileQueues.set(filePath, next);

  void next.then(() => {
    if (fileQueues.get(filePath) === next) {
      fileQueues.delete(filePath);
    }
  });

  return result;
}

function normalizeKey(key) {
  if (typeof key !== "string" || !key.trim()) {
    throw new Error(
      "Çelësi i memories duhet të jetë tekst jo bosh."
    );
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

  try {
    return JSON.parse(serialized);
  } catch {
    throw new Error(
      "Të dhënat e memories nuk mund të kopjohen nga JSON."
    );
  }
}

function validateStore(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Struktura e skedarit të memories është e pavlefshme."
    );
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
    throw new Error(
      "Opsionet e JSON storage janë të pavlefshme."
    );
  }

  const filePath = normalizeFilePath(
    typeof options.filePath === "string" &&
    options.filePath.trim()
      ? options.filePath.trim()
      : "data/xsus-memory.json"
  );

  async function ensureDirectory() {
    await mkdir(path.dirname(filePath), {
      recursive: true,
    });
  }

  async function readStore() {
    let content;

    try {
      content = await readFile(filePath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }

      throw error;
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        "Skedari i memories përmban JSON të pavlefshëm."
      );
    }

    return validateStore(parsed);
  }

  async function writeStore(store) {
    await ensureDirectory();

    const temporaryPath =
      `${filePath}.${process.pid}.${randomUUID()}.tmp`;

    try {
      await writeFile(
        temporaryPath,
        JSON.stringify(store, null, 2),
        {
          encoding: "utf8",
          flag: "wx",
        }
      );

      await rename(temporaryPath, filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
  }

  async function get(key) {
    const normalizedKey = normalizeKey(key);

    return serializeFileOperation(filePath, async () => {
      const store = await readStore();

      if (
        !Object.prototype.hasOwnProperty.call(
          store,
          normalizedKey
        )
      ) {
        return null;
      }

      return cloneJSON(store[normalizedKey]);
    });
  }

  async function set(key, value) {
    const normalizedKey = normalizeKey(key);
    const clonedValue = cloneJSON(value);

    return serializeFileOperation(filePath, async () => {
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

    return serializeFileOperation(filePath, async () => {
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

    return serializeFileOperation(filePath, async () => {
      const store = await readStore();

      return Object.prototype.hasOwnProperty.call(
        store,
        normalizedKey
      );
    });
  }

  async function keys() {
    return serializeFileOperation(filePath, async () => {
      const store = await readStore();
      return Object.keys(store);
    });
  }

  async function clear() {
    return serializeFileOperation(filePath, async () => {
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
    return serializeFileOperation(filePath, async () => {
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
