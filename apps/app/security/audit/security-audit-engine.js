
/**
 * XSUS App — Security Audit Logger Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i ngjarjeve të sigurisë.
 * - Ruajtja append-only në RAM.
 * - Marrja dhe listimi i ngjarjeve.
 * - Kërkimi me filtra.
 * - Kufizimi i madhësisë së historikut.
 * - Mbrojtja e të dhënave sensitive.
 */

import {
  SECURITY_AUDIT_VERSION,
  SECURITY_AUDIT_ACTIONS,
  SECURITY_AUDIT_ERRORS,
  validateSecurityAuditConfig,
  validateSecurityAuditEvent,
  validateSecurityAuditRequest
} from "./security-audit-contracts.js";

export const SECURITY_AUDIT_ENGINE_VERSION = "1.0.0";

const clone = (value) => {
  if (value === undefined) return undefined;

  return structuredClone(value);
};

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    freeze(child);
  }

  return value;
};

const createError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const matchesFilters = (event, filters = {}) => {
  return Object.entries(filters).every(([key, expected]) => {
    const actual = key.split(".").reduce(
      (value, part) => value?.[part],
      event
    );

    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }

    return actual === expected;
  });
};

export function createSecurityAuditEngine(options = {}) {
  const config = validateSecurityAuditConfig(options.config ?? {});

  const events = new Map();
  const history = [];

  let sequence = 0;
  let closed = false;

  const ensureOpen = () => {
    if (closed) {
      throw createError(
        SECURITY_AUDIT_ERRORS.ALREADY_CLOSED,
        "Security Audit Engine është mbyllur."
      );
    }
  };

  const addHistory = (action, eventId = null) => {
    history.push({
      action,
      eventId,
      timestamp: Date.now()
    });

    if (history.length > config.maxHistory) {
      history.splice(0, history.length - config.maxHistory);
    }
  };

  const normalizeEvent = (event) => {
    const validated = validateSecurityAuditEvent(event, config);

    return clone(validated);
  };

  const logEvent = (event) => {
    ensureOpen();

    if (!config.enabled) {
      throw createError(
        SECURITY_AUDIT_ERRORS.PROVIDER_UNAVAILABLE,
        "Regjistrimi i auditimit është çaktivizuar."
      );
    }

    const normalized = normalizeEvent(event);

    if (events.size >= config.maxEvents) {
      throw createError(
        SECURITY_AUDIT_ERRORS.INVALID_CONFIG,
        "Është arritur kufiri maksimal i ngjarjeve."
      );
    }

    const eventId = `audit-${++sequence}`;

    const record = freeze({
      ...normalized,
      eventId,
      sequence,
      timestamp: normalized.timestamp ?? Date.now()
    });

    events.set(eventId, record);
    addHistory("LOG_EVENT", eventId);

    return clone(record);
  };

  const getEvent = (eventId) => {
    ensureOpen();

    if (typeof eventId !== "string" || !eventId.trim()) {
      throw createError(
        SECURITY_AUDIT_ERRORS.INVALID_REQUEST,
        "eventId është i pavlefshëm."
      );
    }

    const event = events.get(eventId);

    if (!event) {
      throw createError(
        SECURITY_AUDIT_ERRORS.EVENT_NOT_FOUND,
        "Ngjarja e auditimit nuk u gjet."
      );
    }

    addHistory("GET_EVENT", eventId);

    return clone(event);
  };

  const listEvents = ({ limit } = {}) => {
    ensureOpen();

    const records = Array.from(events.values());

    const result = limit
      ? records.slice(-limit)
      : records;

    addHistory("LIST_EVENTS");

    return clone(result);
  };

  const queryEvents = ({ filters = {}, limit } = {}) => {
    ensureOpen();

    const records = Array.from(events.values())
      .filter((event) => matchesFilters(event, filters));

    const result = limit
      ? records.slice(-limit)
      : records;

    addHistory("QUERY_EVENTS");

    return clone(result);
  };

  const getStatus = () => {
    ensureOpen();

    addHistory("GET_STATUS");

    return {
      version: SECURITY_AUDIT_ENGINE_VERSION,
      contractVersion: SECURITY_AUDIT_VERSION,
      enabled: config.enabled,
      appendOnly: config.appendOnly,
      closed,
      eventCount: events.size,
      historyCount: history.length,
      maxEvents: config.maxEvents,
      maxHistory: config.maxHistory
    };
  };

  const processRequest = (request) => {
    ensureOpen();

    const validated = validateSecurityAuditRequest(request);

    switch (validated.action) {
      case SECURITY_AUDIT_ACTIONS.LOG_EVENT:
        return logEvent(validated.event);

      case SECURITY_AUDIT_ACTIONS.GET_EVENT:
        return getEvent(validated.eventId);

      case SECURITY_AUDIT_ACTIONS.LIST_EVENTS:
        return listEvents(validated);

      case SECURITY_AUDIT_ACTIONS.QUERY_EVENTS:
        return queryEvents(validated);

      case SECURITY_AUDIT_ACTIONS.GET_STATUS:
        return getStatus();

      default:
        throw createError(
          SECURITY_AUDIT_ERRORS.INVALID_ACTION,
          "Veprimi i auditimit nuk është i vlefshëm."
        );
    }
  };

  const getHistory = () => {
    ensureOpen();
    return clone(history);
  };

  const close = () => {
    if (closed) return;

    events.clear();
    history.length = 0;
    closed = true;
  };

  return Object.freeze({
    version: SECURITY_AUDIT_ENGINE_VERSION,
    logEvent,
    getEvent,
    listEvents,
    queryEvents,
    getStatus,
    processRequest,
    getHistory,
    close
  });
}
