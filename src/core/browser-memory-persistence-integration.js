
/**
 * XSUS AI Core — Browser Memory Persistence Integration
 * Version: 1.0.0
 *
 * Lidh memory-engine me persistent-memory dhe IndexedDB.
 * Ky modul përdoret vetëm nga browser build.
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
  createIndexedDBMemoryStorage,
} from "./indexeddb-memory-storage.js";

export const BROWSER_MEMORY_PERSISTENCE_INTEGRATION_VERSION = "1.0.0";

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
    options.databaseName !== undefined &&
    (
      typeof options.databaseName !== "string" ||
      options.databaseName.trim().length === 0
    )
  ) {
    throw new TypeError(
      "databaseName duhet të jetë tekst jo bosh."
    );
  }

  if (
    options.storeName !== undefined &&
    (
      typeof options.storeName !== "string" ||
      options.storeName.trim().length === 0
    )
  ) {
    throw new TypeError(
      "storeName duhet të jetë tekst jo bosh."
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
    databaseName,
    storeName,
    prefix,
  } = options;

  const resolvedStorage =
    storage ??
    createIndexedDBMemoryStorage({
      ...(databaseName !== undefined ? { databaseName } : {}),
      ...(storeName !== undefined ? { storeName } : {}),
    });

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
