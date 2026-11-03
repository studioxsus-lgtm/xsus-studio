/**
 * XSUS Hyper Core — Knowledge Link Audit Persistence
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Rikthimi i historikut nga storage.
 * - Ruajtja e ID-ve dhe timestamp-eve origjinale.
 * - Ruajtja e ndryshimeve në mënyrë të serializuar.
 * - Rikuperimi i radhës pas dështimeve të storage-it.
 * - Parandalimi i humbjes së ndryshimeve në RAM.
 * - Restaurimi eksplicit i historikut.
 * - Ofrimi i një API asinkrone për Audit Trail.
 */

import {
  createKnowledgeLinkAuditTrail,
  KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
} from "./knowledge-link.audit-trail.js";

export const KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION = "1.0.0";

const DEFAULT_MAX_EVENTS = 1000;

function createPersistenceError(code, message, cause) {
  const error = new Error(message);

  error.name = "KnowledgeLinkAuditPersistenceError";
  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

function assertPlainObject(value, name) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_OBJECT",
      `${name} duhet të jetë objekt i vlefshëm.`,
    );
  }
}

function validatePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_LIMIT",
      `${name} duhet të jetë numër i plotë pozitiv.`,
    );
  }
}

function cloneHistory(history) {
  try {
    return structuredClone(history);
  } catch (cause) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_CLONE_FAILED",
      "Historiku nuk mund të kopjohet.",
      cause,
    );
  }
}

function validateHistory(history) {
  if (!Array.isArray(history)) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_HISTORY",
      "Historiku i ruajtur duhet të jetë array.",
    );
  }

  const ids = new Set();

  for (const event of history) {
    assertPlainObject(event, "event");

    if (event.id !== undefined) {
      if (
        typeof event.id !== "string" ||
        event.id.trim().length === 0
      ) {
        throw createPersistenceError(
          "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_EVENT_ID",
          "Ngjarja përmban ID të pavlefshme.",
        );
      }

      if (ids.has(event.id)) {
        throw createPersistenceError(
          "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_DUPLICATE_EVENT_ID",
          "Historiku përmban ID të përsëritura.",
        );
      }

      ids.add(event.id);
    }

    if (
      event.version !== undefined &&
      event.version !== KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION
    ) {
      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION_MISMATCH",
        "Versioni i ngjarjes nuk përputhet me Audit Trail Engine.",
      );
    }

    if (
      event.timestamp !== undefined &&
      (
        typeof event.timestamp !== "string" ||
        Number.isNaN(Date.parse(event.timestamp))
      )
    ) {
      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_TIMESTAMP",
        "Ngjarja përmban timestamp të pavlefshëm.",
      );
    }
  }
}

function createDefaultEventId(sequence, timestamp) {
  return `knowledge-link-audit-${timestamp}-${sequence}`;
}

function createTemporaryTrail(maxEvents) {
  return createKnowledgeLinkAuditTrail({
    maxEvents,
    idGenerator({ sequence, timestamp }) {
      return createDefaultEventId(sequence, timestamp);
    },
  });
}

/**
 * Normalizon dhe verifikon historikun përpara se
 * ai të vendoset në motorin aktiv.
 *
 * Ngjarjet e vjetra pa ID marrin ID të reja.
 * Ngjarjet ekzistuese ruajnë ID-të origjinale.
 */
function prepareHistory(history, maxEvents) {
  validateHistory(history);

  const temporaryTrail = createTemporaryTrail(maxEvents);

  try {
    for (const event of history.slice(-maxEvents)) {
      if (typeof event.id === "string") {
        temporaryTrail.restoreEvent({
          id: event.id,
          type: event.type,
          status: event.status,
          timestamp: event.timestamp,
          details: event.details ?? {},
        });
      } else {
        temporaryTrail.addEvent({
          type: event.type,
          status: event.status,
          timestamp: event.timestamp,
          details: event.details ?? {},
        });
      }
    }

    return temporaryTrail.listEvents({
      limit: maxEvents,
      newestFirst: false,
    }).events.map((event) => ({
      id: event.id,
      type: event.type,
      status: event.status,
      timestamp: event.timestamp,
      version: event.version,
      details: cloneHistory([event])[0].details,
    }));
  } catch (cause) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_RESTORE_FAILED",
      "Historiku nuk mund të normalizohet ose rikthehet.",
      cause,
    );
  } finally {
    temporaryTrail.close();
  }
}

export async function createKnowledgeLinkAuditPersistence(options = {}) {
  assertPlainObject(options, "options");

  const {
    storage,
    maxEvents = DEFAULT_MAX_EVENTS,
  } = options;

  validatePositiveInteger(maxEvents, "maxEvents");

  if (
    storage === null ||
    typeof storage !== "object" ||
    typeof storage.loadHistory !== "function" ||
    typeof storage.saveHistory !== "function"
  ) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_INVALID_STORAGE",
      "Storage duhet të ofrojë loadHistory() dhe saveHistory().",
    );
  }

  let loadedHistory;

  try {
    loadedHistory = await storage.loadHistory();
  } catch (cause) {
    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_LOAD_FAILED",
      "Ngarkimi i historikut të auditimit dështoi.",
      cause,
    );
  }

  if (loadedHistory === null || loadedHistory === undefined) {
    loadedHistory = [];
  }

  const preparedHistory = prepareHistory(
    loadedHistory,
    maxEvents,
  );

  const auditTrail = createKnowledgeLinkAuditTrail({
    maxEvents,
  });

  try {
    for (const event of preparedHistory) {
      auditTrail.restoreEvent(event);
    }
  } catch (cause) {
    auditTrail.close();

    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_RESTORE_FAILED",
      "Rikthimi fillestar i historikut dështoi.",
      cause,
    );
  }

  let restoreIndex = preparedHistory.length;
  let closed = false;

  let persistenceQueue = Promise.resolve();
  let pendingOperations = 0;
  let lastPersistenceError = null;

  function assertOpen() {
    if (closed) {
      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_CLOSED",
        "Audit Persistence është mbyllur.",
      );
    }
  }

  function getSnapshot() {
    const result = auditTrail.listEvents({
      limit: maxEvents,
      newestFirst: false,
    });

    return cloneHistory(result.events);
  }

  /**
   * Ekzekuton një operacion brenda radhës së përbashkët.
   * Operacioni i ardhshëm pret përfundimin e atij paraprak,
   * edhe në rast dështimi.
   */
  function schedule(operation) {
    assertOpen();

    pendingOperations += 1;

    const currentOperation = persistenceQueue.then(
      async () => operation(),
      async () => operation(),
    );

    persistenceQueue = currentOperation.then(
      () => undefined,
      () => undefined,
    );

    return currentOperation.finally(() => {
      pendingOperations -= 1;
    });
  }

  async function persistCurrentState() {
    const snapshot = getSnapshot();

    try {
      await storage.saveHistory(cloneHistory(snapshot));

      lastPersistenceError = null;
    } catch (cause) {
      lastPersistenceError = cause;

      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
        "Ruajtja e historikut të auditimit dështoi.",
        cause,
      );
    }
  }

  async function addEvent(input) {
    return schedule(async () => {
      const event = auditTrail.addEvent(input);

      await persistCurrentState();

      return event;
    });
  }

  async function clear() {
    return schedule(async () => {
      const result = auditTrail.clear();

      await persistCurrentState();

      return result;
    });
  }

  async function restore() {
    return schedule(async () => {
      let history;

      try {
        history = await storage.loadHistory();
      } catch (cause) {
        throw createPersistenceError(
          "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_LOAD_FAILED",
          "Rikthimi nga storage dështoi.",
          cause,
        );
      }

      if (history === null || history === undefined) {
        history = [];
      }

      // Përgatitja bëhet përpara ndryshimit të RAM-it.
      const prepared = prepareHistory(history, maxEvents);

      // Vetëm pas validimit të plotë ndryshohet gjendja aktive.
      auditTrail.clear();

      for (const event of prepared) {
        auditTrail.restoreEvent(event);
      }

      restoreIndex = prepared.length;
      lastPersistenceError = null;

      return Object.freeze({
        success: true,
        restoredEvents: prepared.length,
        eventCount: auditTrail.getStatus().eventCount,
      });
    });
  }

  async function flush() {
    assertOpen();

    await persistenceQueue;

    if (lastPersistenceError !== null) {
      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
        "Ekziston një ruajtje e fundit e pasuksesshme.",
        lastPersistenceError,
      );
    }

    return Object.freeze({
      success: true,
      persistedEvents: auditTrail.getStatus().eventCount,
    });
  }

  function getEventById(id) {
    assertOpen();
    return auditTrail.getEventById(id);
  }

  function listEvents(filters = {}) {
    assertOpen();
    return auditTrail.listEvents(filters);
  }

  function searchEvents(filters = {}) {
    assertOpen();
    return auditTrail.searchEvents(filters);
  }

  function getStatus() {
    const engineStatus = auditTrail.getStatus();

    return Object.freeze({
      version: KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION,
      engineVersion: KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
      closed,
      initialized: true,
      eventCount: engineStatus.eventCount,
      maxEvents,
      persistencePending: pendingOperations > 0,
      persistenceFailed: lastPersistenceError !== null,
      lastPersistenceError: lastPersistenceError
        ? lastPersistenceError.message
        : null,
    });
  }

  async function close() {
    if (closed) {
      return Object.freeze({
        success: true,
        closed: true,
        alreadyClosed: true,
      });
    }

    await flush();

    auditTrail.close();
    closed = true;

    return Object.freeze({
      success: true,
      closed: true,
      alreadyClosed: false,
    });
  }

  return Object.freeze({
    addEvent,
    getEventById,
    listEvents,
    searchEvents,
    clear,
    restore,
    flush,
    getStatus,
    close,
  });
}
