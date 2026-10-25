
/**
 * XSUS AI Core — Persistent Memory
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ruajtja dhe rikthimi i sesioneve.
 * - Fshirja e sesioneve të ruajtura.
 * - Validimi i integritetit dhe versionit.
 * - Izolimi i gabimeve dhe validimi i hyrjeve.
 * - Koordinimi i operacioneve paralele për çdo sesion.
 *
 * Përdor dependency injection për të mos lidhur
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

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
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

function isValidSavedAt(savedAt) {
  if (savedAt === undefined || savedAt === null) {
    return true;
  }

  if (typeof savedAt !== "string" || savedAt.trim() === "") {
    return false;
  }

  return Number.isFinite(Date.parse(savedAt));
}

function getSnapshotSessionId(snapshot) {
  if (typeof snapshot.sessionId === "string") {
    return snapshot.sessionId;
  }

  if (
    isPlainObject(snapshot.session) &&
    typeof snapshot.session.sessionId === "string"
  ) {
    return snapshot.session.sessionId;
  }

  return undefined;
}

function validateSessionRecord(record, sessionId) {
  if (!isPlainObject(record)) {
    throw createError(
      "INVALID_SESSION_RECORD",
      "Regjistrimi i ruajtur i sesionit nuk është objekt i vlefshëm."
    );
  }

  if (
    !validateSessionId(record.sessionId) ||
    record.sessionId !== sessionId
  ) {
    throw createError(
      "INVALID_SESSION_RECORD",
      "ID-ja e sesionit në regjistrim nuk përputhet."
    );
  }

  if (!isPlainObject(record.snapshot)) {
    throw createError(
      "INVALID_SESSION_RECORD",
      "Snapshot-i i sesionit nuk ka strukturë të vlefshme."
    );
  }

  const snapshotSessionId = getSnapshotSessionId(record.snapshot);

  if (
    snapshotSessionId !== undefined &&
    snapshotSessionId !== sessionId
  ) {
    throw createError(
      "INVALID_SESSION_RECORD",
      "ID-ja e sesionit në snapshot nuk përputhet."
    );
  }

  if (!isValidSavedAt(record.savedAt)) {
    throw createError(
      "INVALID_SESSION_RECORD",
      "Data e ruajtjes së sesionit nuk është e vlefshme."
    );
  }

  if (record.version !== PERSISTENT_MEMORY_VERSION) {
    throw createError(
      "UNSUPPORTED_SESSION_VERSION",
      "Versioni i regjistrimit të sesionit nuk mbështetet."
    );
  }

  return true;
}

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
    throw new TypeError("exportSession duhet të jetë funksion.");
  }

  if (typeof importSession !== "function") {
    throw new TypeError("importSession duhet të jetë funksion.");
  }

  if (typeof prefix !== "string" || prefix.trim().length === 0) {
    throw new TypeError("Prefix duhet të jetë tekst jo bosh.");
  }

  // Një radhë e pavarur për çdo sesion.
  // Ruajtja dhe fshirja përdorin të njëjtën radhë.
  const operationQueues = new Map();

  function getStorageKey(sessionId) {
    if (!validateSessionId(sessionId)) {
      throw createError(
        "INVALID_SESSION_ID",
        "ID-ja e sesionit nuk është e vlefshme."
      );
    }

    return `${prefix}${sessionId}`;
  }

  /**
   * Serializon operacionet për të njëjtin sesion.
   *
   * Një operacion i dështuar nuk e bllokon radhën.
   * Operacionet për sesione të ndryshme mbeten të pavarura.
   */
  function enqueueSessionOperation(key, operation) {
    const previousOperation = operationQueues.get(key);

    const currentOperation = (
      previousOperation
        ? previousOperation.catch(() => undefined)
        : Promise.resolve()
    ).then(operation);

    operationQueues.set(key, currentOperation);

    // Pastro radhën vetëm nëse ende i përket këtij operacioni.
    currentOperation.then(
      () => {
        if (operationQueues.get(key) === currentOperation) {
          operationQueues.delete(key);
        }
      },
      () => {
        if (operationQueues.get(key) === currentOperation) {
          operationQueues.delete(key);
        }
      }
    );

    return currentOperation;
  }

  async function performSaveSession(sessionId, key) {
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

    if (!isPlainObject(snapshot)) {
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

    if (!isPlainObject(serializedSnapshot)) {
      throw createError(
        "SESSION_SERIALIZATION_FAILED",
        "Snapshot-i nuk mund të ruhet si objekt JSON."
      );
    }

    const snapshotSessionId =
      getSnapshotSessionId(serializedSnapshot);

    if (
      snapshotSessionId !== undefined &&
      snapshotSessionId !== sessionId
    ) {
      throw createError(
        "SESSION_ID_MISMATCH",
        "Snapshot-i nuk i përket sesionit të kërkuar."
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

  /**
   * Ruajtja futet në radhën e sesionit.
   */
  async function saveSession(sessionId) {
    const key = getStorageKey(sessionId);

    return enqueueSessionOperation(
      key,
      () => performSaveSession(sessionId, key)
    );
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

    validateSessionRecord(record, sessionId);

    let snapshot;

    try {
      snapshot = cloneData(record.snapshot);
    } catch (error) {
      throw createError(
        "INVALID_SESSION_RECORD",
        "Snapshot-i i ruajtur nuk mund të lexohet.",
        error
      );
    }

    try {
      await importSession(sessionId, snapshot);
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

  /**
   * Fshirja futet në të njëjtën radhë si ruajtja.
   * Nëse ka ruajtje në proces, ajo përfundon e para.
   */
  async function deleteSavedSession(sessionId) {
    const key = getStorageKey(sessionId);

    return enqueueSessionOperation(key, async () => {
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
    });
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
