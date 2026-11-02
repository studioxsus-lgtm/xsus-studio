/**
 * XSUS Hyper Core — Knowledge Link Audit Trail Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i ngjarjeve të integritetit.
 * - Gjenerimi i identifikuesve unikë.
 * - Ruajtja e historikut në RAM.
 * - Kërkimi dhe filtrimi i ngjarjeve.
 * - Kufizimi i madhësisë së historikut.
 * - Mbrojtja e të dhënave të regjistruara nga modifikimi.
 */

export const KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_AUDIT_EVENT_TYPES = Object.freeze([
  "verification",
  "rebuild",
  "recovery",
]);

export const KNOWLEDGE_LINK_AUDIT_STATUSES = Object.freeze([
  "success",
  "failure",
]);

const DEFAULT_MAX_EVENTS = 1000;
const DEFAULT_LIMIT = 100;

function createAuditError(code, message) {
  const error = new Error(message);
  error.name = "KnowledgeLinkAuditTrailError";
  error.code = code;
  return error;
}

function assertPlainObject(value, name) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_OBJECT",
      `${name} duhet të jetë objekt i vlefshëm.`,
    );
  }
}

function cloneAndFreeze(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneAndFreeze));
  }

  if (value !== null && typeof value === "object") {
    assertPlainObject(value, "metadata");

    const clone = {};

    for (const [key, item] of Object.entries(value)) {
      if (
        item === undefined ||
        typeof item === "function" ||
        typeof item === "symbol" ||
        typeof item === "bigint"
      ) {
        throw createAuditError(
          "KNOWLEDGE_LINK_AUDIT_INVALID_METADATA",
          "Metadata përmban një vlerë të pambështetur.",
        );
      }

      clone[key] = cloneAndFreeze(item);
    }

    return Object.freeze(clone);
  }

  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint" ||
    value === undefined
  ) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_METADATA",
      "Metadata përmban një vlerë të pambështetur.",
    );
  }

  return value;
}

function validatePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_LIMIT",
      `${name} duhet të jetë numër i plotë pozitiv.`,
    );
  }
}

function validateEventType(type) {
  if (!KNOWLEDGE_LINK_AUDIT_EVENT_TYPES.includes(type)) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_EVENT_TYPE",
      "Lloji i ngjarjes nuk mbështetet.",
    );
  }
}

function validateStatus(status) {
  if (!KNOWLEDGE_LINK_AUDIT_STATUSES.includes(status)) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_STATUS",
      "Statusi i ngjarjes nuk mbështetet.",
    );
  }
}

function normalizeTimestamp(value) {
  const timestamp = value ?? new Date().toISOString();

  if (
    typeof timestamp !== "string" ||
    Number.isNaN(Date.parse(timestamp))
  ) {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_TIMESTAMP",
      "Timestamp duhet të jetë datë ISO e vlefshme.",
    );
  }

  return new Date(timestamp).toISOString();
}

function createEventId(sequence, timestamp) {
  return `knowledge-link-audit-${timestamp}-${sequence}`;
}

export function createKnowledgeLinkAuditTrail(options = {}) {
  assertPlainObject(options, "options");

  const {
    maxEvents = DEFAULT_MAX_EVENTS,
    idGenerator,
    clock,
  } = options;

  validatePositiveInteger(maxEvents, "maxEvents");

  if (idGenerator !== undefined && typeof idGenerator !== "function") {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_ID_GENERATOR",
      "idGenerator duhet të jetë funksion.",
    );
  }

  if (clock !== undefined && typeof clock !== "function") {
    throw createAuditError(
      "KNOWLEDGE_LINK_AUDIT_INVALID_CLOCK",
      "clock duhet të jetë funksion.",
    );
  }

  const events = new Map();

  let sequence = 0;
  let closed = false;

  function assertOpen() {
    if (closed) {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_TRAIL_CLOSED",
        "Audit Trail Engine është mbyllur.",
      );
    }
  }

  function getTimestamp(inputTimestamp) {
    if (inputTimestamp !== undefined) {
      return normalizeTimestamp(inputTimestamp);
    }

    const value = clock ? clock() : new Date().toISOString();

    return normalizeTimestamp(value);
  }

  function generateId(timestamp) {
    sequence += 1;

    const id = idGenerator
      ? idGenerator({
          sequence,
          timestamp,
        })
      : createEventId(sequence, timestamp);

    if (
      typeof id !== "string" ||
      id.trim().length === 0
    ) {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_INVALID_ID",
        "Gjeneruesi duhet të kthejë një ID të vlefshme.",
      );
    }

    if (events.has(id)) {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_DUPLICATE_ID",
        "ID-ja e ngjarjes ekziston tashmë.",
      );
    }

    return id;
  }

  function addEvent(input) {
    assertOpen();
    assertPlainObject(input, "event");

    const {
      type,
      status,
      details = {},
      timestamp,
    } = input;

    validateEventType(type);
    validateStatus(status);
    assertPlainObject(details, "details");

    const normalizedTimestamp = getTimestamp(timestamp);
    const id = generateId(normalizedTimestamp);
    const frozenDetails = cloneAndFreeze(details);

    const event = Object.freeze({
      id,
      type,
      status,
      timestamp: normalizedTimestamp,
      version: KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
      details: frozenDetails,
    });

    events.set(id, event);

    while (events.size > maxEvents) {
      const oldestId = events.keys().next().value;
      events.delete(oldestId);
    }

    return event;
  }

  function getEventById(id) {
    assertOpen();

    if (typeof id !== "string") {
      return null;
    }

    return events.get(id) ?? null;
  }

  function listEvents(options = {}) {
    assertOpen();
    assertPlainObject(options, "options");

    const {
      type,
      status,
      limit = DEFAULT_LIMIT,
      newestFirst = true,
    } = options;

    if (type !== undefined) {
      validateEventType(type);
    }

    if (status !== undefined) {
      validateStatus(status);
    }

    validatePositiveInteger(limit, "limit");

    if (typeof newestFirst !== "boolean") {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_INVALID_ORDER",
        "newestFirst duhet të jetë boolean.",
      );
    }

    let result = [...events.values()];

    if (type !== undefined) {
      result = result.filter((event) => event.type === type);
    }

    if (status !== undefined) {
      result = result.filter((event) => event.status === status);
    }

    if (newestFirst) {
      result.reverse();
    }

    const selected = result.slice(0, limit);

    return Object.freeze({
      count: selected.length,
      total: result.length,
      events: Object.freeze(selected),
    });
  }

  function searchEvents(filters = {}) {
    assertOpen();
    assertPlainObject(filters, "filters");

    const {
      type,
      status,
      from,
      to,
      limit = DEFAULT_LIMIT,
      newestFirst = true,
    } = filters;

    if (type !== undefined) {
      validateEventType(type);
    }

    if (status !== undefined) {
      validateStatus(status);
    }

    validatePositiveInteger(limit, "limit");

    const fromTime =
      from === undefined ? null : Date.parse(from);

    const toTime =
      to === undefined ? null : Date.parse(to);

    if (
      (fromTime !== null && Number.isNaN(fromTime)) ||
      (toTime !== null && Number.isNaN(toTime))
    ) {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_INVALID_DATE_RANGE",
        "Intervali kohor përmban datë të pavlefshme.",
      );
    }

    if (
      fromTime !== null &&
      toTime !== null &&
      fromTime > toTime
    ) {
      throw createAuditError(
        "KNOWLEDGE_LINK_AUDIT_INVALID_DATE_RANGE",
        "Data fillestare nuk mund të jetë pas datës përfundimtare.",
      );
    }

    let result = [...events.values()];

    if (type !== undefined) {
      result = result.filter((event) => event.type === type);
    }

    if (status !== undefined) {
      result = result.filter((event) => event.status === status);
    }

    if (fromTime !== null) {
      result = result.filter(
        (event) => Date.parse(event.timestamp) >= fromTime,
      );
    }

    if (toTime !== null) {
      result = result.filter(
        (event) => Date.parse(event.timestamp) <= toTime,
      );
    }

    if (newestFirst) {
      result.reverse();
    }

    const selected = result.slice(0, limit);

    return Object.freeze({
      count: selected.length,
      total: result.length,
      events: Object.freeze(selected),
    });
  }

  function clear() {
    assertOpen();

    const removed = events.size;
    events.clear();

    return Object.freeze({
      success: true,
      removed,
    });
  }

  function getStatus() {
    return Object.freeze({
      version: KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
      closed,
      eventCount: events.size,
      maxEvents,
      supportedEventTypes: KNOWLEDGE_LINK_AUDIT_EVENT_TYPES,
      supportedStatuses: KNOWLEDGE_LINK_AUDIT_STATUSES,
    });
  }

  function close() {
    if (closed) {
      return Object.freeze({
        success: true,
        closed: true,
        alreadyClosed: true,
      });
    }

    events.clear();
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
    getStatus,
    close,
  });
}
