
/**
 * XSUS App — Authorization Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kontrolli i autorizimit.
 * - Verifikimi i roleve dhe lejeve.
 * - Zbatimi i deny-by-default.
 * - Regjistrimi i historikut pa sekrete.
 * - Menaxhimi i lifecycle.
 *
 * Vendimet konkrete të autorizimit delegohen te provider-i
 * i injektuar. Ky modul nuk autentikon identitete.
 */

import {
  AUTHORIZATION_ACTIONS,
  AUTHORIZATION_CONTRACT_VERSION,
  AUTHORIZATION_ERROR_CODES,
  createAuthorizationError,
  createAuthorizationResponse,
  validateAuthorizationConfig,
  validateAuthorizationRequest,
} from "./authorization-contracts.js";

export const AUTHORIZATION_MANAGER_VERSION = "1.0.0";

const DEFAULT_CONFIG = Object.freeze({
  denyByDefault: true,
  requireAuthenticatedIdentity: true,
  maxHistory: 100,
});

const REQUIRED_PROVIDER_METHODS = Object.freeze([
  "authorize",
  "checkPermission",
  "checkRole",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeIdentity(identity) {
  if (!isPlainObject(identity)) {
    return null;
  }

  if (
    typeof identity.id !== "string" ||
    !identity.id.trim() ||
    identity.verified !== true
  ) {
    return null;
  }

  const roles = identity.roles === undefined ? [] : identity.roles;

  if (
    !Array.isArray(roles) ||
    !roles.every(
      (role) => typeof role === "string" && role.trim(),
    )
  ) {
    return null;
  }

  const permissions =
    identity.permissions === undefined ? [] : identity.permissions;

  if (
    !Array.isArray(permissions) ||
    !permissions.every(
      (permission) =>
        typeof permission === "string" && permission.trim(),
    )
  ) {
    return null;
  }

  return Object.freeze({
    id: identity.id,
    verified: true,
    roles: Object.freeze([...roles]),
    permissions: Object.freeze([...permissions]),
  });
}

function normalizeDecision(result) {
  if (!isPlainObject(result) || typeof result.allowed !== "boolean") {
    return null;
  }

  return {
    allowed: result.allowed,
    reason:
      typeof result.reason === "string"
        ? result.reason
        : null,
  };
}

export function createAuthorizationManager(options = {}) {
  if (!isPlainObject(options)) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
      "Manager options must be an object.",
    );
  }

  const suppliedConfig = options.config ?? {};

  if (!isPlainObject(suppliedConfig)) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
      "Manager configuration must be an object.",
    );
  }

  const contractConfig = validateAuthorizationConfig({
    denyByDefault: suppliedConfig.denyByDefault,
    requireAuthenticatedIdentity:
      suppliedConfig.requireAuthenticatedIdentity,
    version: suppliedConfig.version,
  });

  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...contractConfig,
    ...(suppliedConfig.maxHistory !== undefined
      ? { maxHistory: suppliedConfig.maxHistory }
      : {}),
  });

  if (
    !Number.isInteger(config.maxHistory) ||
    config.maxHistory < 1
  ) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.INVALID_CONFIG,
      "maxHistory must be a positive integer.",
    );
  }

  const provider = options.provider;

  if (!isPlainObject(provider)) {
    throw createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.PROVIDER_UNAVAILABLE,
      "An authorization provider is required.",
    );
  }

  for (const method of REQUIRED_PROVIDER_METHODS) {
    if (typeof provider[method] !== "function") {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.PROVIDER_UNAVAILABLE,
        `Provider method ${method} is required.`,
      );
    }
  }

  let closed = false;
  let operationInProgress = false;
  const history = [];

  function assertOpen() {
    if (closed) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.ALREADY_CLOSED,
        "Authorization Manager is closed.",
      );
    }
  }

  function record(action, allowed, reason = null) {
    history.push(
      Object.freeze({
        action,
        allowed,
        reason,
        timestamp: new Date().toISOString(),
      }),
    );

    while (history.length > config.maxHistory) {
      history.shift();
    }
  }

  async function execute(action, callback) {
    assertOpen();

    if (operationInProgress) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.PROVIDER_ERROR,
        "Another authorization operation is in progress.",
      );
    }

    operationInProgress = true;

    try {
      return await callback();
    } catch (error) {
      if (
        error?.code &&
        Object.values(AUTHORIZATION_ERROR_CODES).includes(error.code)
      ) {
        throw error;
      }

      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.PROVIDER_ERROR,
        `Provider operation failed: ${action}.`,
      );
    } finally {
      operationInProgress = false;
    }
  }

  function requireIdentity(identity) {
    if (!config.requireAuthenticatedIdentity && identity === undefined) {
      return null;
    }

    const normalized = normalizeIdentity(identity);

    if (!normalized) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.AUTHENTICATION_REQUIRED,
        "A verified identity is required.",
      );
    }

    return normalized;
  }

  async function evaluate(action, identity, payload) {
    const normalizedIdentity = requireIdentity(identity);

    if (!normalizedIdentity) {
      return createAuthorizationResponse({
        success: true,
        allowed: false,
        action,
        reason: "IDENTITY_REQUIRED",
      });
    }

    return execute(action, async () => {
      const result = await provider[action]({
        ...payload,
        identity: normalizedIdentity,
      });

      const decision = normalizeDecision(result);

      if (!decision) {
        throw createAuthorizationError(
          AUTHORIZATION_ERROR_CODES.PROVIDER_ERROR,
          "Provider returned an invalid authorization decision.",
        );
      }

      const allowed = decision.allowed === true;

      record(action, allowed, decision.reason);

      return createAuthorizationResponse({
        success: true,
        allowed,
        action,
        reason: decision.reason,
        metadata: {
          identityId: normalizedIdentity.id,
        },
      });
    });
  }

  async function authorize(payload = {}) {
    assertOpen();

    const request = validateAuthorizationRequest({
      ...payload,
      action: "authorize",
    });

    return evaluate(
      "authorize",
      request.identity,
      {
        resource: request.resource,
        operation: request.operation,
        context: request.context ?? null,
      },
    );
  }

  async function checkPermission(payload = {}) {
    assertOpen();

    const request = validateAuthorizationRequest({
      ...payload,
      action: "checkPermission",
    });

    return evaluate(
      "checkPermission",
      request.identity,
      {
        permission: request.permission,
        context: request.context ?? null,
      },
    );
  }

  async function checkRole(payload = {}) {
    assertOpen();

    const request = validateAuthorizationRequest({
      ...payload,
      action: "checkRole",
    });

    return evaluate(
      "checkRole",
      request.identity,
      {
        role: request.role,
        context: request.context ?? null,
      },
    );
  }

  async function processRequest(request = {}) {
    assertOpen();

    const validated = validateAuthorizationRequest(request);

    switch (validated.action) {
      case "authorize":
        return authorize(validated);

      case "checkPermission":
        return checkPermission(validated);

      case "checkRole":
        return checkRole(validated);

      case "getStatus":
        return getStatus();

      default:
        throw createAuthorizationError(
          AUTHORIZATION_ERROR_CODES.INVALID_ACTION,
          "Unsupported authorization action.",
        );
    }
  }

  function getStatus() {
    assertOpen();

    return Object.freeze({
      version: AUTHORIZATION_MANAGER_VERSION,
      contractVersion: AUTHORIZATION_CONTRACT_VERSION,
      closed,
      operationInProgress,
      denyByDefault: config.denyByDefault,
      requireAuthenticatedIdentity:
        config.requireAuthenticatedIdentity,
      historySize: history.length,
      maxHistory: config.maxHistory,
    });
  }

  function getHistory() {
    assertOpen();
    return Object.freeze([...history]);
  }

  function close() {
    if (closed) {
      return false;
    }

    if (operationInProgress) {
      throw createAuthorizationError(
        AUTHORIZATION_ERROR_CODES.PROVIDER_ERROR,
        "Cannot close while an operation is in progress.",
      );
    }

    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    authorize,
    checkPermission,
    checkRole,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
