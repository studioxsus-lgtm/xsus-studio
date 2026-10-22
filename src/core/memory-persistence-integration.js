
/**
 * XSUS AI Core — Memory Persistence Integration
 * Version: 1.0.0
 *
 * Lidh memory-engine me persistent-memory dhe storage.
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

export function createMemoryPersistence({
  storage,
  filePath,
  prefix,
} = {}) {
  const resolvedStorage =
    storage ?? createJSONMemoryStorage(
      filePath ? { filePath } : undefined
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
