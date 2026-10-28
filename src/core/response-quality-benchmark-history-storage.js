
/**
 * XSUS AI Core — Response Quality Benchmark History Storage
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ruajtja e historikut në JSON.
 * - Ngarkimi dhe validimi i historikut.
 * - Shkrimi atomik për të shmangur skedarë pjesërisht të shkruar.
 * - Rikuperimi i kontrolluar nga gabimet e leximit dhe JSON-it.
 *
 * Kërkon Node.js dhe mbështet node:fs/promises.
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
} from "node:path";

import { randomUUID } from "node:crypto";

export const RESPONSE_QUALITY_BENCHMARK_HISTORY_STORAGE_VERSION =
  "1.0.0";

const STORAGE_FORMAT = "xsus-benchmark-history";
const STORAGE_FORMAT_VERSION = 1;

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

/**
 * Krijon një storage adapter JSON.
 *
 * @param {object} options
 * @param {string} options.filePath
 * @returns {object}
 */
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

  /**
   * Ruajtja bëhet fillimisht në një skedar të përkohshëm,
   * pastaj zëvendësohet skedari kryesor përmes rename().
   */
  async function saveHistory(history) {
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
   * Ngarkon dhe validon historikun e ruajtur.
   * Skedari që mungon kthehet si histori bosh vetëm
   * kur gabimi është ENOENT.
   */
  async function loadHistory() {
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

  return Object.freeze({
    saveHistory,
    loadHistory,
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
