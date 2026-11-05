
/**
 * XSUS App — Session Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i veprimeve të sesioneve.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Standardizimi i gabimeve dhe përgjigjeve.
 */

export const SESSION_CONTRACT_VERSION = "1.0.0";

export const SESSION_ACTIONS = Object.freeze([
  "createSession",
  "getSession",
  "verifySession",
  "refreshSession",
  "revokeSession",
  "revokeUserSessions",
  "listUserSessions",
  "getStatus",
]);

export const SESSION_ERROR_CODES = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_SESSION: "INVALID_SESSION",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  SESSION_ALREADY_EXISTS: "SESSION_ALREADY_EXISTS",
  INVALID_USER: "INVALID_USER",
  SESSION_LIMIT_REACHED: "SESSION_LIMIT_REACHED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const DEFAULT_SESSION_CONFIG = Object.freeze({
  version: SESSION_CONTRACT_VERSION,
  sessionDurationMs: 30 * 60 * 1000,
  maxSessionsPerUser: 10,
  maxSessions: 10000,
  allowRefresh: true,
});

export function createSessionError(
  code,
  message,
  details = null,
) {
  const validCode = Object.values(SESSION_ERROR_CODES).includes(code)
    ? code
    : SESSION_ERROR_CODES.PROVIDER_ERROR;

  const error = new Error(
    `[${validCode}] ${message || "Session error."}`,
  );

  error.name = "SessionError";
  error.code = validCode;
  error.details = details;

  return error;
}

export function validateSessionConfig(config = {}) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_CONFIG,
      "Configuration must be an object.",
    );
  }

  const allowedKeys = [
    "version",
    "sessionDurationMs",
    "maxSessionsPerUser",
    "maxSessions",
    "allowRefresh",
  ];

  for (const key of Object.keys(config)) {
    if (!allowedKeys.includes(key)) {
      throw createSessionError(
        SESSION_ERROR_CODES.INVALID_CONFIG,
        `Unknown configuration option: ${key}.`,
      );
    }
  }

  if (
    config.version !== undefined &&
    config.version !== SESSION_CONTRACT_VERSION
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_CONFIG,
      "Unsupported session contract version.",
    );
  }

  for (const key of [
    "sessionDurationMs",
    "maxSessionsPerUser",
    "maxSessions",
  ]) {
    if (
      config[key] !== undefined &&
      (!Number.isSafeInteger(config[key]) || config[key] < 1)
    ) {
      throw createSessionError(
        SESSION_ERROR_CODES.INVALID_CONFIG,
        `${key} must be a positive safe integer.`,
      );
    }
  }

  if (
    config.allowRefresh !== undefined &&
    typeof config.allowRefresh !== "boolean"
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_CONFIG,
      "allowRefresh must be a boolean.",
    );
  }

  const normalized = {
    ...DEFAULT_SESSION_CONFIG,
    ...config,
  };

  if (normalized.maxSessionsPerUser > normalized.maxSessions) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_CONFIG,
      "maxSessionsPerUser cannot exceed maxSessions.",
    );
  }

  return Object.freeze(normalized);
}

function validateUserId(userId) {
  if (
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_USER,
      "A valid user id is required.",
    );
  }

  return userId;
}

function validateSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    !sessionId.trim()
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_SESSION,
      "A valid session id is required.",
    );
  }

  return sessionId;
}

export function validateSessionRequest(request = {}) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_REQUEST,
      "Session request must be an object.",
    );
  }

  const { action } = request;

  if (
    typeof action !== "string" ||
    !SESSION_ACTIONS.includes(action)
  ) {
    throw createSessionError(
      SESSION_ERROR_CODES.INVALID_ACTION,
      "Unsupported session action.",
    );
  }

  if (action === "getStatus") {
    return Object.freeze({ action });
  }

  if (action === "createSession") {
    return Object.freeze({
      action,
      userId: validateUserId(request.userId),
      metadata:
        request.metadata &&
        typeof request.metadata === "object" &&
        !Array.isArray(request.metadata)
          ? Object.freeze({ ...request.metadata })
          : Object.freeze({}),
    });
  }

  if (
    [
      "getSession",
      "verifySession",
      "refreshSession",
      "revokeSession",
    ].includes(action)
  ) {
    return Object.freeze({
      action,
      sessionId: validateSessionId(request.sessionId),
    });
  }

  if (
    action === "revokeUserSessions" ||
    action === "listUserSessions"
  ) {
    return Object.freeze({
      action,
      userId: validateUserId(request.userId),
    });
  }

  throw createSessionError(
    SESSION_ERROR_CODES.INVALID_ACTION,
    "Unsupported session action.",
  );
}

export function createSessionResponse({
  success = true,
  action = null,
  data = null,
  metadata = {},
} = {}) {
  return Object.freeze({
    success,
    action,
    data,
    version: SESSION_CONTRACT_VERSION,
    metadata: Object.freeze({ ...metadata }),
  });
}
