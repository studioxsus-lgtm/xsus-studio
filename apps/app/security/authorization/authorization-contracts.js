/**
 * XSUS App — Authorization Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përcaktimi i veprimeve të autorizimit.
 * - Standardizimi i gabimeve.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Standardizimi i përgjigjeve.
 */

export const AUTHORIZATION_CONTRACT_VERSION = "1.0.0";

export const AUTHORIZATION_ACTIONS = Object.freeze([
  "authorize",
  "checkPermission",
  "checkRole",
  "getStatus",
]);

export const AUTHORIZATION_ERROR_CODES = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_IDENTITY: "INVALID_IDENTITY",
  ACCESS_DENIED: "ACCESS_DENIED",
  PERMISSION_NOT_FOUND: "PERMISSION_NOT_FOUND",
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const DEFAULT_AUTHORIZATION_CONFIG = Object.freeze({
  version: AUTHORIZATION_CONTRACT_VERSION,
  denyByDefault: true,
  requireAuthenticatedIdentity: true,
});

export function createAuthorizationError(
  code,
  message,
  details = null,
) {
  const validCode = Object.values(AUTHORIZATION_ERROR_CODES).includes(code)
    ? code
    : AUTHORIZATION_ERROR_CODES.PROVIDER_ERROR;

  const error = new Error(
    `[${validCode}] ${message || "Authorization error."}`,
  );

  error.name = "AuthorizationError";
  error.code = validCode;
  error.details = details;

  return error;
}

export function validateAuthorizationConfig(config = {}) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
      "Configuration must be an object.",
    );
  }

  const allowedKeys = [
    "version",
    "denyByDefault",
    "requireAuthenticatedIdentity",
  ];

  for (const key of Object.keys(config)) {
    if (!allowedKeys.includes(key)) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
        `Unknown configuration option: ${key}.`,
      );
    }
  }

  if (
    config.version !== undefined &&
    config.version !== AUTHORIZATION_CONTRACT_VERSION
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
      "Unsupported authorization contract version.",
    );
  }

  for (const key of [
    "denyByDefault",
    "requireAuthenticatedIdentity",
  ]) {
    if (
      config[key] !== undefined &&
      typeof config[key] !== "boolean"
    ) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
        `${key} must be a boolean.`,
      );
    }
  }

  return Object.freeze({
    ...DEFAULT_AUTHORIZATION_CONFIG,
    ...config,
  });
}

export function validateAuthorizationRequest(request = {}) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_REQUEST,
      "Authorization request must be an object.",
    );
  }

  const action = request.action;

  if (
    typeof action !== "string" ||
    !AUTHORIZATION_ACTIONS.includes(action)
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_ACTION,
      "Unsupported authorization action.",
    );
  }

  if (action === "getStatus") {
    return Object.freeze({ action });
  }

  if (action === "authorize") {
    if (
      typeof request.resource !== "string" ||
      !request.resource.trim() ||
      typeof request.operation !== "string" ||
      !request.operation.trim()
    ) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.INVALID_REQUEST,
        "Resource and operation are required.",
      );
    }
  }

  if (
    action === "checkPermission" &&
    (
      typeof request.permission !== "string" ||
      !request.permission.trim()
    )
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_REQUEST,
      "Permission is required.",
    );
  }

  if (
    action === "checkRole" &&
    (
      typeof request.role !== "string" ||
      !request.role.trim()
    )
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_REQUEST,
      "Role is required.",
    );
  }

  if (
    request.identity !== undefined &&
    (
      !request.identity ||
      typeof request.identity !== "object" ||
      Array.isArray(request.identity)
    )
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_IDENTITY,
      "Identity must be an object.",
    );
  }

  return Object.freeze({ ...request });
}

export function createAuthorizationResponse({
  success = true,
  allowed = false,
  action = null,
  reason = null,
  metadata = {},
} = {}) {
  return Object.freeze({
    success,
    allowed,
    action,
    reason,
    version: AUTHORIZATION_CONTRACT_VERSION,
    metadata: Object.freeze({ ...metadata }),
  });
}
