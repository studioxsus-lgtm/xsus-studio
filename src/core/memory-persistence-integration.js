/**
 * XSUS AI Core — Memory Persistence Integration
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Lidh memory-engine me persistent-memory dhe storage.
 * - Validon konfigurimin fillestar.
 * - Ruajnë përputhshmërinë me API-në ekzistuese.
 * - Mundëson përdorimin e storage të personalizuar.
 */

import {
  exportMemorySession,
  restoreMemorySession,
  deleteMemorySession,
} from "./memory-engine.js";

import {
  createPersistentMemory,
} from "./persistent-memory.js";

import {
  createJSONMemoryStorage,
} from "./json-memory-storage.js";

export const MEMORY_PERSISTENCE_INTEGRATION_VERSION = "1.1.0";

function validateOptions(options) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Konfigurimi i memory persistence duhet të jetë objekt."
    );
  }

  if (
    options.filePath !== undefined &&
    (
      typeof options.filePath !== "string" ||
      options.filePath.trim().length === 0
    )
  ) {
    throw new TypeError(
      "filePath duhet të jetë tekst jo bosh."
    );
  }

  if (
    options.prefix !== undefined &&
    typeof options.prefix !== "string"
  ) {
    throw new TypeError(
      "prefix duhet të jetë tekst."
    );
  }

  if (
    options.storage !== undefined &&
    (
      options.storage === null ||
      typeof options.storage !== "object"
    )
  ) {
    throw new TypeError(
      "storage duhet të jetë një objekt i vlefshëm."
    );
  }
}

export function createMemoryPersistence(options = {}) {
  validateOptions(options);

  const {
    storage,
    filePath,
    prefix,
  } = options;

  const resolvedStorage =
    storage ??
    createJSONMemoryStorage(
      filePath !== undefined
        ? { filePath }
        : undefined
    );

  return createPersistentMemory({
    storage: resolvedStorage,
    prefix,

    exportSession: async (sessionId) =>
      exportMemorySession(sessionId),

    importSession: async (sessionId, snapshot) =>
      restoreMemorySession(sessionId, snapshot),

    deleteSession: async (sessionId) =>
      deleteMemorySession(sessionId),
  });
}
