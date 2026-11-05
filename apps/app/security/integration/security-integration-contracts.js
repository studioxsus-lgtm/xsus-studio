
/**
 * XSUS App — Security Integration Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i kërkesave të integrimit.
 * - Validimi i konfigurimit.
 * - Validimi i identitetit të verifikuar nga Authentication Manager.
 * - Validimi i resource dhe operation.
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

/**
 * Kontrollon nëse vlera është objekt i thjeshtë.
 */
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

/**
 * Krijon gabim të brendshëm standard.
 */
function createError(code, message, details = {}) {
  const error = new Error(message);

  error.code = code;

  if (isPlainObject(details)) {
    error.details = deepFreeze(cloneValue(details));
  }

  return error;
}

/**
 * Kopjon primitive, array dhe objekte të thjeshta.
 * Mbështet referencat ciklike.
 * Nuk përdor structuredClone().
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
        "Vlerat numerike duhet të jenë finite."
      );
    }

    return value;
  }

  if (typeof value !== "object") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Struktura përmban një tip të pambështetur."
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
      "Lejohen vetëm objekte të thjeshta."
    );
  }

  const result = {};

  seen.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "Lejohen vetëm çelësa string."
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      value,
      key
    );

    if (
      !descriptor ||
      !Object.prototype.hasOwnProperty.call(
        descriptor,
        "value"
      )
    ) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "Accessor properties nuk lejohen."
      );
    }

    Object.defineProperty(result, key, {
      value: cloneValue(descriptor.value, seen),
      enumerable: descriptor.enumerable,
      configurable: true,
      writable: true,
    });
  }

  return result;
}

/**
 * Ngrin në mënyrë rekursive objektet dhe array.
 * Mbështet referencat ciklike.
 */
function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    seen.has(value)
  ) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(
      value,
      key
    );

    if (
      descriptor &&
      Object.prototype.hasOwnProperty.call(
        descriptor,
        "value"
      )
    ) {
      deepFreeze(descriptor.value, seen);
    }
  }

  return Object.freeze(value);
}

/**
 * Validon boolean.
 */
function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë boolean.`
    );
  }

  return value;
}

/**
 * Validon numër të plotë pozitiv.
 */
function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      `${field} duhet të jetë numër i plotë pozitiv.`
    );
  }

  return value;
}

/**
 * Validon string jo bosh.
 */
function requireNonEmptyString(value, field, errorCode) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw createError(
      errorCode,
      `${field} është i detyrueshëm.`
    );
  }

  return value.trim();
}

/**
 * Validon konfigurimin e integrimit.
 *
 * Identiteti i verifikuar është gjithmonë i detyrueshëm.
 */
export function validateSecurityIntegrationConfig(config = {}) {
  if (!isPlainObject(config)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      "Config duhet të jetë objekt."
    );
  }

  const normalized = {
    ...SECURITY_INTEGRATION_DEFAULTS,
    ...config,
  };

  requireBoolean(
    normalized.denyByDefault,
    "denyByDefault"
  );

  requireBoolean(
    normalized.requireVerifiedIdentity,
    "requireVerifiedIdentity"
  );

  requireBoolean(
    normalized.requireAudit,
    "requireAudit"
  );

  requireBoolean(
    normalized.auditDeniedRequests,
    "auditDeniedRequests"
  );

  requireBoolean(
    normalized.auditAllowedRequests,
    "auditAllowedRequests"
  );

  requirePositiveInteger(
    normalized.maxHistory,
    "maxHistory"
  );

  if (!normalized.requireVerifiedIdentity) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
      "requireVerifiedIdentity duhet të jetë true."
    );
  }

  return Object.freeze(normalized);
}

/**
 * Validon identitetin e marrë nga Authentication Manager.
 *
 * Ky funksion nuk duhet të përdoret për t'i besuar
 * identitetit të dërguar nga klienti.
 *
 * roles dhe permissions janë metadata.
 * RBAC dhe Permission Engine mbeten autoritetet.
 */
export function validateSecurityIntegrationIdentity(identity) {
  if (!isPlainObject(identity)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity duhet të jetë objekt."
    );
  }

  const id = requireNonEmptyString(
    identity.id,
    "Identity id",
    SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY
  );

  if (typeof identity.verified !== "boolean") {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity verified duhet të jetë boolean."
    );
  }

  if (!identity.verified) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.IDENTITY_NOT_VERIFIED,
      "Identiteti nuk është verifikuar."
    );
  }

  const roles = identity.roles ?? [];

  if (
    !Array.isArray(roles) ||
    !roles.every(
      (role) =>
        typeof role === "string" &&
        role.trim().length > 0
    )
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity roles duhet të jetë listë me string-e të vlefshme."
    );
  }

  const permissions = identity.permissions ?? [];

  if (
    !Array.isArray(permissions) ||
    !permissions.every(
      (permission) =>
        typeof permission === "string" &&
        permission.trim().length > 0
    )
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_IDENTITY,
      "Identity permissions duhet të jetë listë me string-e të vlefshme."
    );
  }

  return Object.freeze({
    id,
    verified: true,
    roles: Object.freeze([
      ...new Set(
        roles.map((role) => role.trim())
      ),
    ]),
    permissions: Object.freeze([
      ...new Set(
        permissions.map((permission) => permission.trim())
      ),
    ]),
  });
}

/**
 * Validon dhe kopjon resource.
 */
export function validateSecurityIntegrationResource(resource) {
  if (!isPlainObject(resource)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource duhet të jetë objekt."
    );
  }

  const id = requireNonEmptyString(
    resource.id,
    "Resource id",
    SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE
  );

  const type = requireNonEmptyString(
    resource.type,
    "Resource type",
    SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE
  );

  let copied;

  try {
    copied = cloneValue(resource);
  } catch {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_RESOURCE,
      "Resource përmban strukturë të pavlefshme."
    );
  }

  copied.id = id;
  copied.type = type;

  return deepFreeze(copied);
}

/**
 * Validon kërkesën publike të integrimit.
 *
 * Identiteti nuk pranohet nga request.
 * Integration Engine duhet ta marrë atë nga
 * Authentication Manager.
 */
export function validateSecurityIntegrationRequest(request) {
  if (!isPlainObject(request)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Request duhet të jetë objekt."
    );
  }

  /**
   * SECURITY CHECK:
   *
   * Identiteti nuk lejohet të vijë nga klienti.
   *
   * Nëse klienti dërgon identity:
   * 1. Identiteti kontrollohet për të ruajtur
   *    gabimet e sakta të validimit.
   * 2. Identiteti i paverifikuar refuzohet.
   * 3. Edhe identiteti i verifikuar refuzohet
   *    sepse nuk është burim autoritativ.
   *
   * Integration Engine duhet të përdorë
   * Authentication Manager për identitetin.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      request,
      "identity"
    )
  ) {
    validateSecurityIntegrationIdentity(
      request.identity
    );

    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Identity nuk lejohet në kërkesën publike. Përdoret sesioni i verifikuar."
    );
  }

  const action = request.action;

  if (
    !Object.values(
      SECURITY_INTEGRATION_ACTIONS
    ).includes(action)
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_ACTION,
      "Action nuk mbështetet."
    );
  }

  if (
    action === SECURITY_INTEGRATION_ACTIONS.GET_STATUS
  ) {
    return Object.freeze({
      action,
    });
  }

  if (
    action === SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE
  ) {
    const role = requireNonEmptyString(
      request.role,
      "role",
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST
    );

    return Object.freeze({
      action,
      role,
    });
  }

  if (
    action === SECURITY_INTEGRATION_ACTIONS.CHECK_PERMISSION
  ) {
    const permission = requireNonEmptyString(
      request.permission,
      "permission",
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST
    );

    return Object.freeze({
      action,
      permission,
    });
  }

  const resource = validateSecurityIntegrationResource(
    request.resource
  );

  const operation = requireNonEmptyString(
    request.operation,
    "operation",
    SECURITY_INTEGRATION_ERRORS.INVALID_OPERATION
  );

  let context = {};

  if (request.context !== undefined) {
    if (!isPlainObject(request.context)) {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "context duhet të jetë objekt."
      );
    }

    try {
      context = cloneValue(request.context);
    } catch {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "context përmban strukturë të pavlefshme."
      );
    }
  }

  return Object.freeze({
    action,
    resource,
    operation,
    context: deepFreeze(context),
  });
}

/**
 * Krijon përgjigje standarde.
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
      "Përgjigjja e integrimit është e pavlefshme."
    );
  }

  if (
    reason !== null &&
    reason !== undefined &&
    typeof reason !== "string"
  ) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "reason duhet të jetë string ose null."
    );
  }

  let normalizedData = null;

  if (data !== null && data !== undefined) {
    try {
      normalizedData = deepFreeze(
        cloneValue(data)
      );
    } catch {
      throw createError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "Response data përmban strukturë të pavlefshme."
      );
    }
  }

  return Object.freeze({
    version: SECURITY_INTEGRATION_VERSION,
    action: action.trim(),
    allowed,
    reason: reason ?? null,
    data: normalizedData,
  });
}

/**
 * Krijon gabim standard të integrimit.
 */
export function createSecurityIntegrationError(
  code,
  message,
  details = {}
) {
  const validCodes = Object.values(
    SECURITY_INTEGRATION_ERRORS
  );

  if (!validCodes.includes(code)) {
    throw createError(
      SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
      "Security integration error code nuk është i vlefshëm."
    );
  }

  return createError(
    code,
    message,
    details
  );
}
