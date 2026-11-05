
/**
 * XSUS App — Security Integration Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i kërkesave të integrimit.
 * - Validimi i konfigurimit.
 * - Validimi i identitetit dhe burimit.
 * - Mbrojtja e strukturave të të dhënave nga ndryshimet e jashtme.
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

export function isPlainObject(value) {
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
    error.details = deepFreeze(cloneValue(details));
  }

  return error;
}

/**
 * Kopjon vetëm vlera primitive, array dhe objekte të thjeshta.
 * Refuzon struktura të pambështetura dhe ruan referencat ciklike
 * pa krijuar varësi nga structuredClone().
 */
function cloneValue(value, seen = new WeakMap()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "Vlerat numerike duhet të jenë finite.",
      );
    }

    return value;
  }

  if (typeof value !== "object") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Struktura përmban një tip të pambështetur.",
    );
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const result = [];
    seen.set(value, result);

    for (const item of value) {
      result.push(cloneValue(item, seen));
    }

    return result;
  }

  if (!isPlainObject(value)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Lejohen vetëm objekte të thjeshta.",
    );
  }

  const result = {};
  seen.set(value, result);

  for (const [key, item] of Object.entries(value)) {
    Object.defineProperty(result, key, {
      value: cloneValue(item, seen),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return result;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    seen.has(value)
  ) {
    return value;
  }

  seen.add(value);

  for (const item of Object.values(value)) {
    deepFreeze(item, seen);
  }

  return Object.freeze(value);
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë boolean.`,
    );
  }

  return value;
}

function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë numër i plotë pozitiv.`,
    );
  }

  return value;
}

/**
 * Validon konfigurimin e integrimit.
 *
 * requireVerifiedIdentity duhet të mbetet true sepse
 * Authorization Manager aktualisht kërkon identitet
 * të verifikuar.
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

  if (!normalized.requireVerifiedIdentity) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      "requireVerifiedIdentity duhet të jetë true me Authorization Manager aktual.",
    );
  }

  return Object.freeze(normalized);
}

/**
 * Validon identitetin e përdoruesit.
 *
 * roles dhe permissions ruhen si metadata të deklaruara.
 * Ato nuk përbëjnë burim autoritativ të autorizimit.
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

  if (typeof identity.verified !== "boolean") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity verified duhet të jetë boolean.",
    );
  }

  if (
    !Array.isArray(identity.roles) ||
    !identity.roles.every(
      (role) => typeof role === "string" && role.trim().length > 0,
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
        typeof permission === "string" &&
        permission.trim().length > 0,
    )
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity permissions duhet të jetë listë me string-e të vlefshme.",
    );
  }

  if (!identity.verified) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.IDENTITY_NOT_VERIFIED,
      "Identiteti nuk është verifikuar.",
    );
  }

  const roles = Object.freeze([
    ...new Set(identity.roles.map((role) => role.trim())),
  ]);

  const permissions = Object.freeze([
    ...new Set(
      identity.permissions.map((permission) => permission.trim()),
    ),
  ]);

  return Object.freeze({
    id: identity.id.trim(),
    verified: true,
    roles,
    permissions,
  });
}

/**
 * Validon dhe kopjon burimin e kërkesës.
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

  let copied;

  try {
    copied = cloneValue(resource);
  } catch (error) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource përmban strukturë të pavlefshme.",
    );
  }

  copied.id = resource.id.trim();
  copied.type = resource.type.trim();

  return deepFreeze(copied);
}

/**
 * Validon kërkesën e integrimit.
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

  if (
    request.action === SECURITY_INTEGRATION_ACTIONS.GET_STATUS
  ) {
    return Object.freeze({
      action: request.action,
    });
  }

  const identity = validateSecurityIntegrationIdentity(
    request.identity,
  );

  if (
    request.action === SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE
  ) {
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

  let context = {};

  if (request.context !== undefined) {
    if (!isPlainObject(request.context)) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "context duhet të jetë objekt.",
      );
    }

    try {
      context = cloneValue(request.context);
    } catch (error) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "context përmban strukturë të pavlefshme.",
      );
    }
  }

  return Object.freeze({
    action: request.action,
    identity,
    resource,
    operation: request.operation.trim(),
    context: deepFreeze(context),
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

  let normalizedData = null;

  if (data !== null && data !== undefined) {
    try {
      normalizedData = deepFreeze(cloneValue(data));
    } catch (error) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "Response data përmban strukturë të pavlefshme.",
      );
    }
  }

  return Object.freeze({
    version: SECURITY_INTEGRATION_VERSION,
    action: action.trim(),
    allowed,
    reason:
      typeof reason === "string" ? reason : null,
    data: normalizedData,
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
