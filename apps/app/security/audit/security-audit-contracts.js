
/**
 * XSUS App — Security Audit Logger Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i veprimeve të auditimit.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Sanitizimi i të dhënave të ndjeshme.
 * - Parandalimi i regjistrimit të sekreteve.
 * - Ruajtja e kontratave të pavarura nga implementimi.
 */

export const SECURITY_AUDIT_VERSION = "1.0.0";

export const SECURITY_AUDIT_ACTIONS = Object.freeze({
  LOG_EVENT: "logEvent",
  GET_EVENT: "getEvent",
  LIST_EVENTS: "listEvents",
  QUERY_EVENTS: "queryEvents",
  GET_STATUS: "getStatus",
});

export const SECURITY_AUDIT_ERRORS = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_EVENT: "INVALID_EVENT",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  INVALID_FILTER: "INVALID_FILTER",
  INVALID_LIMIT: "INVALID_LIMIT",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const SECURITY_AUDIT_DEFAULTS = Object.freeze({
  enabled: true,
  appendOnly: true,
  maxEvents: 10000,
  maxHistory: 1000,
  maxEventSize: 16384,
  denySensitiveData: true,
});

const SECRET_KEYS = Object.freeze([
  "password",
  "passwd",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "clientsecret",
  "apikey",
  "privatekey",
  "credentials",
]);

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeKey = (key) =>
  String(key).toLowerCase().replace(/[-_\s]/g, "");

const containsSensitiveData = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return true;

  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveData(item, seen));
  }

  return Object.entries(value).some(([key, item]) => {
    if (SECRET_KEYS.includes(normalizeKey(key))) return true;
    return containsSensitiveData(item, seen);
  });
};

const sanitizeValue = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new TypeError("Cyclic data is not allowed.");
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  const result = {};

  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEYS.includes(normalizeKey(key))) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = sanitizeValue(item, seen);
    }
  }

  return result;
};

const fail = (code, message) => {
  const error = new Error(message);
  error.code = code;
  throw error;
};

export function validateSecurityAuditConfig(config = {}) {
  if (!isPlainObject(config)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_CONFIG,
      "Konfigurimi duhet të jetë objekt."
    );
  }

  const normalized = {
    ...SECURITY_AUDIT_DEFAULTS,
    ...config,
  };

  for (const key of [
    "enabled",
    "appendOnly",
    "denySensitiveData",
  ]) {
    if (typeof normalized[key] !== "boolean") {
      fail(
        SECURITY_AUDIT_ERRORS.INVALID_CONFIG,
        `${key} duhet të jetë boolean.`
      );
    }
  }

  for (const key of [
    "maxEvents",
    "maxHistory",
    "maxEventSize",
  ]) {
    if (
      !Number.isSafeInteger(normalized[key]) ||
      normalized[key] <= 0
    ) {
      fail(
        SECURITY_AUDIT_ERRORS.INVALID_CONFIG,
        `${key} duhet të jetë numër i plotë pozitiv.`
      );
    }
  }

  if (normalized.appendOnly !== true) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_CONFIG,
      "Audit Logger duhet të jetë append-only."
    );
  }

  return Object.freeze(normalized);
}

export function validateSecurityAuditEvent(event, config = {}) {
  if (!isPlainObject(event)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "Ngjarja duhet të jetë objekt."
    );
  }

  if (!isNonEmptyString(event.type)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "type është i detyrueshëm."
    );
  }

  if (!isNonEmptyString(event.action)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "action është i detyrueshëm."
    );
  }

  if (
    event.subject !== undefined &&
    !isPlainObject(event.subject)
  ) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "subject duhet të jetë objekt."
    );
  }

  if (
    event.resource !== undefined &&
    !isPlainObject(event.resource)
  ) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "resource duhet të jetë objekt."
    );
  }

  if (
    event.metadata !== undefined &&
    !isPlainObject(event.metadata)
  ) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "metadata duhet të jetë objekt."
    );
  }

  const settings = validateSecurityAuditConfig(config);

  if (
    settings.denySensitiveData &&
    containsSensitiveData(event)
  ) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "Ngjarja përmban fusha të ndjeshme."
    );
  }

  let serialized;

  try {
    serialized = JSON.stringify(event);
  } catch {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "Ngjarja nuk mund të serializohet."
    );
  }

  if (
    typeof serialized !== "string" ||
    serialized.length > settings.maxEventSize
  ) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "Ngjarja tejkalon madhësinë e lejuar."
    );
  }

  return Object.freeze(sanitizeValue(event));
}

export function validateSecurityAuditRequest(request) {
  if (!isPlainObject(request)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_REQUEST,
      "Kërkesa duhet të jetë objekt."
    );
  }

  if (!Object.values(SECURITY_AUDIT_ACTIONS).includes(request.action)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_ACTION,
      "Veprimi i kërkuar nuk është i vlefshëm."
    );
  }

  switch (request.action) {
    case SECURITY_AUDIT_ACTIONS.LOG_EVENT:
      if (!isPlainObject(request.event)) {
        fail(
          SECURITY_AUDIT_ERRORS.INVALID_REQUEST,
          "event është i detyrueshëm."
        );
      }
      break;

    case SECURITY_AUDIT_ACTIONS.GET_EVENT:
      if (!isNonEmptyString(request.eventId)) {
        fail(
          SECURITY_AUDIT_ERRORS.INVALID_REQUEST,
          "eventId është i detyrueshëm."
        );
      }
      break;

    case SECURITY_AUDIT_ACTIONS.LIST_EVENTS:
      if (
        request.limit !== undefined &&
        (!Number.isSafeInteger(request.limit) || request.limit <= 0)
      ) {
        fail(
          SECURITY_AUDIT_ERRORS.INVALID_LIMIT,
          "limit duhet të jetë numër i plotë pozitiv."
        );
      }
      break;

    case SECURITY_AUDIT_ACTIONS.QUERY_EVENTS:
      if (
        request.filters !== undefined &&
        !isPlainObject(request.filters)
      ) {
        fail(
          SECURITY_AUDIT_ERRORS.INVALID_FILTER,
          "filters duhet të jetë objekt."
        );
      }

      if (
        request.limit !== undefined &&
        (!Number.isSafeInteger(request.limit) || request.limit <= 0)
      ) {
        fail(
          SECURITY_AUDIT_ERRORS.INVALID_LIMIT,
          "limit duhet të jetë numër i plotë pozitiv."
        );
      }
      break;

    case SECURITY_AUDIT_ACTIONS.GET_STATUS:
      break;

    default:
      fail(
        SECURITY_AUDIT_ERRORS.INVALID_ACTION,
        "Veprimi nuk mbështetet."
      );
  }

  return Object.freeze({ ...request });
}

export function sanitizeSecurityAuditData(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    fail(
      SECURITY_AUDIT_ERRORS.INVALID_EVENT,
      "Të dhënat duhet të jenë objekt ose array."
    );
  }

  return sanitizeValue(value);
}
