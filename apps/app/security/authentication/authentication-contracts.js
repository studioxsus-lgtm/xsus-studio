
/**
 * XSUS App — Authentication Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përcaktimi i kontratës së autentikimit.
 * - Validimi i kërkesave.
 * - Standardizimi i përgjigjeve dhe gabimeve.
 * - Ruajtja e një API-je të qëndrueshme.
 */

export const AUTHENTICATION_CONTRACT_VERSION = "1.0.0";

export const AUTHENTICATION_ACTIONS = Object.freeze([
  "authenticate",
  "verify",
  "logout",
  "refresh",
  "getStatus",
]);

export const AUTHENTICATION_ERROR_CODES = Object.freeze({
  INVALID_CONFIG: "AUTH_INVALID_CONFIG",
  INVALID_REQUEST: "AUTH_INVALID_REQUEST",
  INVALID_ACTION: "AUTH_INVALID_ACTION",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  SESSION_NOT_FOUND: "AUTH_SESSION_NOT_FOUND",
  PROVIDER_UNAVAILABLE: "AUTH_PROVIDER_UNAVAILABLE",
  PROVIDER_ERROR: "AUTH_PROVIDER_ERROR",
  ALREADY_CLOSED: "AUTH_ALREADY_CLOSED",
});

export const DEFAULT_AUTHENTICATION_CONFIG = Object.freeze({
  version: AUTHENTICATION_CONTRACT_VERSION,
  allowRegistration: false,
  requireVerifiedIdentity: true,
  sessionRequired: true,
});

export function createAuthenticationError(code, message, details = null) {
  if (
    typeof code !== "string" ||
    !Object.values(AUTHENTICATION_ERROR_CODES).includes(code)
  ) {
    throw new TypeError("Invalid authentication error code.");
  }

  const error = new Error(
    typeof message === "string" && message.trim()
      ? message
      : code
  );

  error.name = "AuthenticationError";
  error.code = code;
  error.details = details;

  return error;
}

export function validateAuthenticationConfig(config = {}) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return {
      valid: false,
      errors: ["Configuration must be an object."],
    };
  }

  const errors = [];

  if (
    config.allowRegistration !== undefined &&
    typeof config.allowRegistration !== "boolean"
  ) {
    errors.push("allowRegistration must be a boolean.");
  }

  if (
    config.requireVerifiedIdentity !== undefined &&
    typeof config.requireVerifiedIdentity !== "boolean"
  ) {
    errors.push("requireVerifiedIdentity must be a boolean.");
  }

  if (
    config.sessionRequired !== undefined &&
    typeof config.sessionRequired !== "boolean"
  ) {
    errors.push("sessionRequired must be a boolean.");
  }

  if (
    config.version !== undefined &&
    config.version !== AUTHENTICATION_CONTRACT_VERSION
  ) {
    errors.push("Unsupported authentication contract version.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAuthenticationRequest(request = {}) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return {
      valid: false,
      errors: ["Request must be an object."],
    };
  }

  const errors = [];

  if (
    typeof request.action !== "string" ||
    !AUTHENTICATION_ACTIONS.includes(request.action)
  ) {
    errors.push("Invalid authentication action.");
  }

  if (
    request.payload !== undefined &&
    (
      !request.payload ||
      typeof request.payload !== "object" ||
      Array.isArray(request.payload)
    )
  ) {
    errors.push("payload must be an object.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createAuthenticationResponse({
  success = false,
  action = null,
  authenticated = false,
  user = null,
  session = null,
  error = null,
  metadata = {},
} = {}) {
  return Object.freeze({
    success: Boolean(success),
    version: AUTHENTICATION_CONTRACT_VERSION,
    action,
    authenticated: Boolean(authenticated),
    user,
    session,
    error,
    metadata: Object.freeze({
      ...metadata,
      version: AUTHENTICATION_CONTRACT_VERSION,
    }),
  });
}
