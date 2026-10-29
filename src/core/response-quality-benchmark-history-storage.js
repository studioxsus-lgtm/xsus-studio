/**
 * XSUS AI Core — Response Quality Benchmark History Storage
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Ruajtja dhe ngarkimi i historikut JSON.
 * - Validimi i historikut.
 * - Shkrimi atomik.
 * - Koordinimi i shkrimeve brenda të njëjtit proces Node.js.
 * - Përditësimi transaksional për adapterët që përdorin të njëjtin skedar.
 */

import {
  readFile,
  writeFile,
  rename,
  unlink,
} from "node:fs/promises";

import {
  dirname,
  basename,
  join,
  resolve,
} from "node:path";

import { randomUUID } from "node:crypto";

export const RESPONSE_QUALITY_BENCHMARK_HISTORY_STORAGE_VERSION =
  "1.1.0";

const STORAGE_FORMAT = "xsus-benchmark-history";
const STORAGE_FORMAT_VERSION = 1;

/**
 * Kyçet ndahen mes të gjithë adapterëve të këtij moduli
 * që përdorin të njëjtën rrugë absolute të skedarit.
 */
const pathLocks = new Map();

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  if (isPlainObject(value)) {
    const result = {};

    for (const key of Object.keys(value)) {
      result[key] = deepClone(value[key]);
    }

    return result;
  }

  return value;
}

/**
 * Serializon operacionet për një skedar.
 * Gabimi i një operacioni nuk bllokon operacionet pasuese.
 */
async function withPathLock(pathKey, operation) {
  const previous = pathLocks.get(pathKey) ?? Promise.resolve();

  let release;

  const current = new Promise((resolvePromise) => {
    release = resolvePromise;
  });

  const queued = previous.then(() => current);

  pathLocks.set(pathKey, queued);

  await previous.catch(() => {});

  try {
    return await operation();
  } finally {
    release();

    if (pathLocks.get(pathKey) === queued) {
      pathLocks.delete(pathKey);
    }
  }
}

function validateHistory(history) {
  if (!Array.isArray(history)) {
    throw new TypeError(
      "history duhet të jetë një array."
    );
  }

  const ids = new Set();

  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index];

    if (!isPlainObject(entry)) {
      throw new TypeError(
        "history[" + index + "] duhet të jetë objekt i thjeshtë."
      );
    }

    if (
      typeof entry.id !== "string" ||
      entry.id.trim().length === 0
    ) {
      throw new TypeError(
        "history[" + index + "].id duhet të jetë tekst jo bosh."
      );
    }

    const id = entry.id.trim();

    if (ids.has(id)) {
      throw new TypeError(
        "ID e përsëritur në history: " + id + "."
      );
    }

    ids.add(id);

    if (
      typeof entry.timestamp !== "number" ||
      !Number.isFinite(entry.timestamp) ||
      entry.timestamp < 0
    ) {
      throw new TypeError(
        "history[" + index + "].timestamp nuk është i vlefshëm."
      );
    }

    if (
      !Number.isInteger(entry.sequence) ||
      entry.sequence < 1
    ) {
      throw new TypeError(
        "history[" + index + "].sequence nuk është i vlefshëm."
      );
    }

    if (!isPlainObject(entry.report)) {
      throw new TypeError(
        "history[" + index + "].report duhet të jetë objekt i thjeshtë."
      );
    }

    if (!isPlainObject(entry.report.summary)) {
      throw new TypeError(
        "history[" + index + "].report.summary duhet të jetë objekt i thjeshtë."
      );
    }

    if (!Array.isArray(entry.report.results)) {
      throw new TypeError(
        "history[" + index + "].report.results duhet të jetë një array."
      );
    }
  }

  return history;
}

function validateDocument(document) {
  if (!isPlainObject(document)) {
    throw new TypeError(
      "Dokumenti i historikut duhet të jetë objekt i thjeshtë."
    );
  }

  if (document.format !== STORAGE_FORMAT) {
    throw new TypeError(
      "Formati i skedarit të historikut nuk njihet."
    );
  }

  if (document.formatVersion !== STORAGE_FORMAT_VERSION) {
    throw new TypeError(
      "Versioni i formatit të historikut nuk mbështetet."
    );
  }

  if (!Array.isArray(document.entries)) {
    throw new TypeError(
      "entries duhet të jetë një array."
    );
  }

  validateHistory(document.entries);

  return document;
}

function createDocument(history) {
  return {
    format: STORAGE_FORMAT,
    formatVersion: STORAGE_FORMAT_VERSION,
    engineVersion:
      RESPONSE_QUALITY_BENCHMARK_HISTORY_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    entries: deepClone(history),
  };
}

function createStorageError(message, cause) {
  const error = new Error(message, { cause });
  error.name = "BenchmarkHistoryStorageError";
  return error;
}

export function createResponseQualityBenchmarkHistoryStorage(
  options = {}
) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "options duhet të jetë objekt i thjeshtë."
    );
  }

  if (
    typeof options.filePath !== "string" ||
    options.filePath.trim().length === 0
  ) {
    throw new TypeError(
      "filePath duhet të jetë tekst jo bosh."
    );
  }

  const filePath = options.filePath;
  const lockKey = resolve(filePath);

  /**
   * Lexon skedarin pa marrë kyçin.
   * Përdoret nga transaksionet që tashmë e mbajnë kyçin.
   */
  async function loadHistoryUnlocked() {
    let serialized;

    try {
      serialized = await readFile(filePath, "utf8");
    } catch (cause) {
      if (cause && cause.code === "ENOENT") {
        return [];
      }

      throw createStorageError(
        "Leximi i historikut benchmark dështoi.",
        cause
      );
    }

    let document;

    try {
      document = JSON.parse(serialized);
    } catch (cause) {
      throw createStorageError(
        "Skedari i historikut benchmark përmban JSON të pavlefshëm.",
        cause
      );
    }

    try {
      validateDocument(document);
    } catch (cause) {
      throw createStorageError(
        "Validimi i historikut benchmark dështoi.",
        cause
      );
    }

    return deepClone(document.entries);
  }

  /**
   * Shkruan skedarin pa marrë kyçin.
   * Thirret vetëm nga operacione që tashmë janë të koordinuara.
   */
  async function saveHistoryUnlocked(history) {
    validateHistory(history);

    const document = createDocument(history);
    const serialized = JSON.stringify(document, null, 2);

    const temporaryPath = join(
      dirname(filePath),
      "." +
        basename(filePath) +
        "." +
        randomUUID() +
        ".tmp"
    );

    try {
      await writeFile(temporaryPath, serialized, {
        encoding: "utf8",
        flag: "wx",
      });

      await rename(temporaryPath, filePath);

      return {
        version:
          RESPONSE_QUALITY_BENCHMARK_HISTORY_STORAGE_VERSION,
        savedCount: history.length,
        filePath,
      };
    } catch (cause) {
      try {
        await unlink(temporaryPath);
      } catch {
        // Skedari i përkohshëm mund të mos ekzistojë.
      }

      throw createStorageError(
        "Ruajtja e historikut benchmark dështoi.",
        cause
      );
    }
  }

  /**
   * Ruajtje e koordinuar për adapterët që përdorin të njëjtin skedar.
   */
  async function saveHistory(history) {
    const snapshot = deepClone(history);

    return withPathLock(lockKey, () =>
      saveHistoryUnlocked(snapshot)
    );
  }

  /**
   * Ngarkim i koordinuar me shkrimet brenda procesit.
   */
  async function loadHistory() {
    return withPathLock(lockKey, loadHistoryUnlocked);
  }

  /**
   * Transaksion leximi-ndryshimi-ruajtjeje.
   *
   * updater merr një kopje të historikut aktual dhe duhet
   * të kthejë array-in e ri që dëshiron të ruajë.
   *
   * Transaksioni dështon nëse updater nuk kthen një array
   * të vlefshëm ose nëse leximi/ruajtja dështon.
   */
  async function updateHistory(updater) {
    if (typeof updater !== "function") {
      throw new TypeError(
        "updater duhet të jetë funksion."
      );
    }

    return withPathLock(lockKey, async () => {
      const currentHistory = await loadHistoryUnlocked();

      const updatedHistory = await updater(
        deepClone(currentHistory)
      );

      validateHistory(updatedHistory);

      const snapshot = deepClone(updatedHistory);

      const saveResult = await saveHistoryUnlocked(snapshot);

      return {
        ...saveResult,
        history: deepClone(snapshot),
      };
    });
  }

  return Object.freeze({
    saveHistory,
    loadHistory,
    updateHistory,

    getMetadata() {
      return Object.freeze({
        version:
          RESPONSE_QUALITY_BENCHMARK_HISTORY_STORAGE_VERSION,
        format: STORAGE_FORMAT,
        formatVersion: STORAGE_FORMAT_VERSION,
        filePath,
      });
    },
  });
}

export default createResponseQualityBenchmarkHistoryStorage;
