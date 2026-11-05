
/**
 * XSUS App — Security Integration Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i kërkesave të integrimit.
 * - Validimi i konfigurimit.
 * - Validimi i identitetit dhe burimit.
 * - Standardizimi i gabimeve dhe përgjigjeve.
 *
 * Ky modul nuk krijon ose ndryshon motorët e sigurisë.
 */

export const SECURITY_INTEGRATION_VERSION = "1.0.0";

export const SECURITY_INTEGRATION_ACTIONS = Object.freeze({
  AUTHORIZE: "authorize",
  CHECK_PERMISSION: "checkPermission",
  CHECK_ROLE: "checkRole",
  GET_STATUS: "getStatus",
});

export const SECURITY_INTEGRATION_ERRORS = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_IDENTITY: "INVALID_IDENTITY",
  IDENTITY_NOT_VERIFIED: "IDENTITY_NOT_VERIFIED",
  INVALID_RESOURCE: "INVALID_RESOURCE",
  INVALID_OPERATION: "INVALID_OPERATION",
  ACCESS_DENIED: "ACCESS_DENIED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  AUDIT_UNAVAILABLE: "AUDIT_UNAVAILABLE",
  INTEGRATION_CLOSED: "INTEGRATION_CLOSED",
});

export const SECURITY_INTEGRATION_DEFAULTS = Object.freeze({
  denyByDefault: true,
  requireVerifiedIdentity: true,
  requireAudit: true,
  auditDeniedRequests: true,
  auditAllowedRequests: true,
  maxHistory: 100,
});

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;

  if (isPlainObject(details)) {
    error.details = Object.freeze({ ...details });
  }

  return error;
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë boolean.`,
    );
  }
}

function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë numër i plotë pozitiv.`,
    );
  }
}

/**
 * Validon konfigurimin e integrimit.
 */
export function validateSecurityIntegrationConfig(config = {}) {
  if (!isPlainObject(config)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      "Config duhet të jetë objekt.",
    );
  }

  const normalized = {
    ...SECURITY_INTEGRATION_DEFAULTS,
    ...config,
  };

  requireBoolean(normalized.denyByDefault, "denyByDefault");
  requireBoolean(
    normalized.requireVerifiedIdentity,
    "requireVerifiedIdentity",
  );
  requireBoolean(normalized.requireAudit, "requireAudit");
  requireBoolean(
    normalized.auditDeniedRequests,
    "auditDeniedRequests",
  );
  requireBoolean(
    normalized.auditAllowedRequests,
    "auditAllowedRequests",
  );
  requirePositiveInteger(normalized.maxHistory, "maxHistory");

  return Object.freeze(normalized);
}

/**
 * Validon identitetin e përdoruesit.
 */
export function validateSecurityIntegrationIdentity(identity) {
  if (!isPlainObject(identity)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity duhet të jetë objekt.",
    );
  }

  if (
    typeof identity.id !== "string" ||
    !identity.id.trim()
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity id është i detyrueshëm.",
    );
  }

  if (
    typeof identity.verified !== "boolean"
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity verified duhet të jetë boolean.",
    );
  }

  if (
    !Array.isArray(identity.roles) ||
    !identity.roles.every(
      (role) => typeof role === "string" && role.trim(),
    )
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity roles duhet të jetë listë me string-e të vlefshme.",
    );
  }

  if (
    !Array.isArray(identity.permissions) ||
    !identity.permissions.every(
      (permission) =>
        typeof permission === "string" && permission.trim(),
    )
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity permissions duhet të jetë listë me string-e të vlefshme.",
    );
  }

  return Object.freeze({
    id: identity.id.trim(),
    verified: identity.verified,
    roles: Object.freeze([...new Set(identity.roles)]),
    permissions: Object.freeze([
      ...new Set(identity.permissions),
    ]),
  });
}

/**
 * Validon burimin e kërkesës.
 */
export function validateSecurityIntegrationResource(resource) {
  if (!isPlainObject(resource)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource duhet të jetë objekt.",
    );
  }

  if (
    typeof resource.id !== "string" ||
    !resource.id.trim()
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource id është i detyrueshëm.",
    );
  }

  if (
    typeof resource.type !== "string" ||
    !resource.type.trim()
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource type është i detyrueshëm.",
    );
  }

  return Object.freeze({
    ...resource,
    id: resource.id.trim(),
    type: resource.type.trim(),
  });
}

/**
 * Validon kërkesën e autorizimit.
 */
export function validateSecurityIntegrationRequest(request) {
  if (!isPlainObject(request)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Request duhet të jetë objekt.",
    );
  }

  const actions = Object.values(SECURITY_INTEGRATION_ACTIONS);

  if (!actions.includes(request.action)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_ACTION,
      "Action nuk mbështetet.",
    );
  }

  if (request.action === SECURITY_INTEGRATION_ACTIONS.GET_STATUS) {
    return Object.freeze({
      action: request.action,
    });
  }

  const identity = validateSecurityIntegrationIdentity(
    request.identity,
  );

  if (!identity.verified) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.IDENTITY_NOT_VERIFIED,
      "Identiteti nuk është verifikuar.",
    );
  }

  if (request.action === SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE) {
    if (
      typeof request.role !== "string" ||
      !request.role.trim()
    ) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "role është i detyrueshëm.",
      );
    }

    return Object.freeze({
      action: request.action,
      identity,
      role: request.role.trim(),
    });
  }

  if (
    request.action ===
    SECURITY_INTEGRATION_ACTIONS.CHECK_PERMISSION
  ) {
    if (
      typeof request.permission !== "string" ||
      !request.permission.trim()
    ) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "permission është i detyrueshëm.",
      );
    }

    return Object.freeze({
      action: request.action,
      identity,
      permission: request.permission.trim(),
    });
  }

  const resource = validateSecurityIntegrationResource(
    request.resource,
  );

  if (
    typeof request.operation !== "string" ||
    !request.operation.trim()
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_OPERATION,
      "operation është i detyrueshëm.",
    );
  }

  if (
    request.context !== undefined &&
    !isPlainObject(request.context)
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "context duhet të jetë objekt.",
    );
  }

  return Object.freeze({
    action: request.action,
    identity,
    resource,
    operation: request.operation.trim(),
    context: Object.freeze({
      ...(request.context ?? {}),
    }),
  });
}

/**
 * Krijon përgjigje standarde të integrimit.
 */
export function createSecurityIntegrationResponse({
  action,
  allowed,
  reason,
  data = null,
}) {
  if (
    typeof action !== "string" ||
    !action.trim() ||
    typeof allowed !== "boolean"
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Përgjigjja e integrimit është e pavlefshme.",
    );
  }

  return Object.freeze({
    version: SECURITY_INTEGRATION_VERSION,
    action,
    allowed,
    reason:
      typeof reason === "string" ? reason : null,
    data,
  });
}

/**
 * Krijon gabim standard të integrimit.
 */
export function createSecurityIntegrationError(
  code,
  message,
  details = {},
) {
  const validCodes = Object.values(
    SECURITY_INTEGRATION_ERRORS,
  );

  if (!validCodes.includes(code)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Security integration error code nuk është i vlefshëm.",
    );
  }

  return createError(code, message, details);
}

