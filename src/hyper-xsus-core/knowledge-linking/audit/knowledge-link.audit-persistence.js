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

    if (
      event.version !== KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION
    ) {
      throw createPersistenceError(
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION_MISMATCH",
        "Versioni i ngjarjes nuk përputhet me Audit Trail Engine.",
      );
    }

    if (
      typeof event.timestamp !== "string" ||
      Number.isNaN(Date.parse(event.timestamp))
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

  validateHistory(loadedHistory);

  const history = loadedHistory.slice(-maxEvents);
  const restoreIds = history.map((event) => event.id);

  let restoreIndex = 0;
  let closed = false;
  let persistenceQueue = Promise.resolve();
  let lastPersistenceError = null;

  const auditTrail = createKnowledgeLinkAuditTrail({
    maxEvents,

    idGenerator({ sequence, timestamp }) {
      if (restoreIndex < restoreIds.length) {
        const id = restoreIds[restoreIndex];
        restoreIndex += 1;
        return id;
      }

      return createDefaultEventId(sequence, timestamp);
    },
  });

  try {
    for (const event of history) {
      auditTrail.addEvent({
        type: event.type,
        status: event.status,
        timestamp: event.timestamp,
        details: event.details,
      });
    }
  } catch (cause) {
    auditTrail.close();

    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_RESTORE_FAILED",
      "Rikthimi i historikut të auditimit dështoi.",
      cause,
    );
  }

  if (restoreIndex !== restoreIds.length) {
    auditTrail.close();

    throw createPersistenceError(
      "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_RESTORE_INCOMPLETE",
      "Jo të gjitha ID-të origjinale u rikthyen.",
    );
  }

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

  function enqueueSave() {
    assertOpen();

    const snapshot = getSnapshot();

    const operation = persistenceQueue
      .catch(() => undefined)
      .then(async () => {
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
      });

    persistenceQueue = operation;

    return operation;
  }

  async function addEvent(input) {
    assertOpen();

    const event = auditTrail.addEvent(input);

    await enqueueSave();

    return event;
  }

  async function clear() {
    assertOpen();

    const result = auditTrail.clear();

    await enqueueSave();

    return result;
  }

  async function flush() {
    assertOpen();

    try {
      await persistenceQueue;
    } catch (cause) {
      throw cause;
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
      persistencePending: false,
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
    flush,
    getStatus,
    close,
  });
}
