/**
 * XSUS AI Core — Persistent Memory
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ruajtja e sesioneve në storage.
 * - Rikthimi i sesioneve të ruajtura.
 * - Fshirja e sesioneve të ruajtura.
 * - Izolimi i gabimeve dhe validimi i hyrjeve.
 *
 * Ky modul përdor dependency injection për të mos lidhur
 * logjikën e memories me një backend të vetëm.
 */

export const PERSISTENT_MEMORY_VERSION = "1.0.0";

const DEFAULT_PREFIX = "xsus:memory:session:";
const MAX_SESSION_ID_LENGTH = 128;

function validateSessionId(sessionId) {
  return (
    typeof sessionId === "string" &&
    sessionId.trim().length > 0 &&
    sessionId.length <= MAX_SESSION_ID_LENGTH
  );
}

function cloneData(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function createError(code, message, cause) {
  const error = new Error(message);

  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

/**
 * Krijon shërbimin e memories së qëndrueshme.
 *
 * storage:
 *   Adapter që ofron get(), set() dhe delete().
 *
 * exportSession:
 *   Funksion që kthen një snapshot të sesionit nga memory-engine.
 *
 * importSession:
 *   Funksion që rikthen një snapshot në memory-engine.
 *
 * deleteSession:
 *   Funksion opsional për fshirjen e sesionit nga memory-engine.
 */
export function createPersistentMemory({
  storage,
  exportSession,
  importSession,
  deleteSession,
  prefix = DEFAULT_PREFIX
} = {}) {
  if (
    !storage ||
    typeof storage.get !== "function" ||
    typeof storage.set !== "function" ||
    typeof storage.delete !== "function"
  ) {
    throw new TypeError(
      "Storage duhet të ofrojë funksionet get, set dhe delete."
    );
  }

  if (typeof exportSession !== "function") {
    throw new TypeError(
      "exportSession duhet të jetë funksion."
    );
  }

  if (typeof importSession !== "function") {
    throw new TypeError(
      "importSession duhet të jetë funksion."
    );
  }

  if (typeof prefix !== "string" || prefix.length === 0) {
    throw new TypeError(
      "Prefix duhet të jetë tekst jo bosh."
    );
  }

  function getStorageKey(sessionId) {
    if (!validateSessionId(sessionId)) {
      throw createError(
        "INVALID_SESSION_ID",
        "ID-ja e sesionit nuk është e vlefshme."
      );
    }

    return `${prefix}${sessionId}`;
  }

  async function saveSession(sessionId) {
    const key = getStorageKey(sessionId);

    let snapshot;

    try {
      snapshot = await exportSession(sessionId);
    } catch (error) {
      throw createError(
        "SESSION_EXPORT_FAILED",
        "Sesioni nuk mund të eksportohet.",
        error
      );
    }

    if (snapshot == null || typeof snapshot !== "object") {
      throw createError(
        "SESSION_NOT_FOUND",
        "Nuk u gjet një snapshot i vlefshëm për sesionin."
      );
    }

    let serializedSnapshot;

    try {
      serializedSnapshot = cloneData(snapshot);
    } catch (error) {
      throw createError(
        "SESSION_SERIALIZATION_FAILED",
        "Të dhënat e sesionit nuk mund të serializohen.",
        error
      );
    }

    const record = {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId,
      savedAt: new Date().toISOString(),
      snapshot: serializedSnapshot
    };

    try {
      await storage.set(key, record);
    } catch (error) {
      throw createError(
        "SESSION_SAVE_FAILED",
        "Sesioni nuk mund të ruhet në storage.",
        error
      );
    }

    return {
      success: true,
      sessionId,
      version: PERSISTENT_MEMORY_VERSION,
      savedAt: record.savedAt
    };
  }

  async function restoreSession(sessionId) {
    const key = getStorageKey(sessionId);

    let record;

    try {
      record = await storage.get(key);
    } catch (error) {
      throw createError(
        "SESSION_READ_FAILED",
        "Sesioni nuk mund të lexohet nga storage.",
        error
      );
    }

    if (record == null) {
      return {
        success: false,
        restored: false,
        sessionId,
        reason: "SESSION_NOT_FOUND"
      };
    }

    if (
      typeof record !== "object" ||
      record.sessionId !== sessionId ||
      record.snapshot == null ||
      typeof record.snapshot !== "object"
    ) {
      throw createError(
        "INVALID_SESSION_RECORD",
        "Regjistrimi i ruajtur i sesionit nuk është i vlefshëm."
      );
    }

    try {
      await importSession(
        sessionId,
        cloneData(record.snapshot)
      );
    } catch (error) {
      throw createError(
        "SESSION_RESTORE_FAILED",
        "Sesioni nuk mund të rikthehet në memory-engine.",
        error
      );
    }

    return {
      success: true,
      restored: true,
      sessionId,
      savedAt: record.savedAt ?? null
    };
  }

  async function deleteSavedSession(sessionId) {
    const key = getStorageKey(sessionId);

    try {
      await storage.delete(key);
    } catch (error) {
      throw createError(
        "SESSION_DELETE_FAILED",
        "Sesioni i ruajtur nuk mund të fshihet.",
        error
      );
    }

    return {
      success: true,
      sessionId
    };
  }

  async function deleteSessionCompletely(sessionId) {
    const saved = await deleteSavedSession(sessionId);

    if (typeof deleteSession === "function") {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        throw createError(
          "ACTIVE_SESSION_DELETE_FAILED",
          "Regjistrimi u fshi nga storage, por sesioni aktiv nuk u fshi.",
          error
        );
      }
    }

    return saved;
  }

  async function hasSavedSession(sessionId) {
    const key = getStorageKey(sessionId);

    try {
      return (await storage.get(key)) != null;
    } catch (error) {
      throw createError(
        "SESSION_READ_FAILED",
        "Nuk mund të kontrollohet ekzistenca e sesionit.",
        error
      );
    }
  }

  return Object.freeze({
    version: PERSISTENT_MEMORY_VERSION,
    saveSession,
    restoreSession,
    deleteSavedSession,
    deleteSessionCompletely,
    hasSavedSession
  });
}
