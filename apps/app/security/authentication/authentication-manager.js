
import {
  AUTHENTICATION_ACTIONS,
  AUTHENTICATION_CONTRACT_VERSION,
  AUTHENTICATION_ERROR_CODES,
  createAuthenticationError,
  createAuthenticationResponse,
  validateAuthenticationConfig,
  validateAuthenticationRequest,
} from "./authentication-contracts.js";

export const AUTHENTICATION_MANAGER_VERSION = "1.0.0";

const DEFAULT_CONFIG = Object.freeze({
  ...{
    allowRegistration: false,
    requireVerifiedIdentity: true,
    sessionRequired: true,
  },
  maxHistory: 100,
});

const PROVIDER_METHODS = Object.freeze({
  authenticate: "authenticate",
  verify: "verify",
  logout: "logout",
  refresh: "refresh",
});

function createManagerError(code, message, details = null) {
  return createAuthenticationError(code, message, details);
}

function validateProvider(provider) {
  if (!provider || typeof provider !== "object") {
    return {
      valid: false,
      errors: ["Authentication provider is required."],
    };
  }

  const errors = [];

  for (const method of Object.values(PROVIDER_METHODS)) {
    if (typeof provider[method] !== "function") {
      errors.push(`Provider method ${method} is required.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function normalizeIdentity(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    return null;
  }

  if (
    typeof identity.id !== "string" ||
    !identity.id.trim()
  ) {
    return null;
  }

  return Object.freeze({
    id: identity.id,
    verified: identity.verified === true,
    roles: Array.isArray(identity.roles)
      ? Object.freeze([...identity.roles])
      : Object.freeze([]),
  });
}

function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return null;
  }

  if (
    typeof session.id !== "string" ||
    !session.id.trim()
  ) {
    return null;
  }

  return Object.freeze({
    id: session.id,
    expiresAt: session.expiresAt ?? null,
  });
}

export function createAuthenticationManager(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw createManagerError(
      AUTHENTICATION_ERROR_CODES.INVALID_CONFIG,
      "Invalid authentication manager configuration."
    );
  }

  const provider = options.provider;
  const providerValidation = validateProvider(provider);

  if (!providerValidation.valid) {
    throw createManagerError(
      AUTHENTICATION_ERROR_CODES.PROVIDER_UNAVAILABLE,
      "Authentication provider is incomplete.",
      providerValidation.errors
    );
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...(options.config || {}),
  };

  const configValidation = validateAuthenticationConfig(config);

  if (
    !configValidation.valid ||
    !Number.isInteger(config.maxHistory) ||
    config.maxHistory < 1
  ) {
    throw createManagerError(
      AUTHENTICATION_ERROR_CODES.INVALID_CONFIG,
      "Invalid authentication manager configuration.",
      configValidation.errors
    );
  }

  let closed = false;
  let currentIdentity = null;
  let currentSession = null;
  let operationInProgress = false;

  const history = [];

  function ensureOpen() {
    if (closed) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.ALREADY_CLOSED,
        "Authentication manager is closed."
      );
    }
  }

  function record(action, success) {
    history.push(Object.freeze({
      action,
      success,
      timestamp: new Date().toISOString(),
    }));

    if (history.length > config.maxHistory) {
      history.shift();
    }
  }

  function createResponse(action, success, error = null) {
    return createAuthenticationResponse({
      success,
      action,
      authenticated: Boolean(currentIdentity && currentSession),
      user: currentIdentity,
      session: currentSession,
      error: error
        ? {
            code: error.code,
            message: error.message,
          }
        : null,
      metadata: {
        managerVersion: AUTHENTICATION_MANAGER_VERSION,
      },
    });
  }

  async function execute(action, payload = {}) {
    ensureOpen();

    if (operationInProgress) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.AUTHENTICATION_FAILED,
        "Another authentication operation is in progress."
      );
    }

    operationInProgress = true;

    try {
      const result = await provider[action](payload);

      if (!result || typeof result !== "object") {
        throw createManagerError(
          AUTHENTICATION_ERROR_CODES.PROVIDER_ERROR,
          "Authentication provider returned an invalid result."
        );
      }

      return result;
    } finally {
      operationInProgress = false;
    }
  }

  async function authenticate(payload = {}) {
    ensureOpen();

    const result = await execute("authenticate", payload);

    if (result.success !== true) {
      currentIdentity = null;
      currentSession = null;

      record("authenticate", false);

      return createResponse(
        "authenticate",
        false,
        createManagerError(
          AUTHENTICATION_ERROR_CODES.INVALID_CREDENTIALS,
          "Authentication failed."
        )
      );
    }

    const identity = normalizeIdentity(result.user);
    const session = normalizeSession(result.session);

    if (!identity || !session) {
      currentIdentity = null;
      currentSession = null;

      record("authenticate", false);

      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.PROVIDER_ERROR,
        "Provider returned an invalid identity or session."
      );
    }

    if (
      config.requireVerifiedIdentity &&
      !identity.verified
    ) {
      currentIdentity = null;
      currentSession = null;

      record("authenticate", false);

      return createResponse(
        "authenticate",
        false,
        createManagerError(
          AUTHENTICATION_ERROR_CODES.INVALID_CREDENTIALS,
          "Identity verification is required."
        )
      );
    }

    currentIdentity = identity;
    currentSession = session;

    record("authenticate", true);

    return createResponse("authenticate", true);
  }

  async function verify(payload = {}) {
    ensureOpen();

    const result = await execute("verify", {
      ...payload,
      session: currentSession,
    });

    const valid = result.valid === true;

    if (!valid) {
      currentIdentity = null;
      currentSession = null;
    }

    record("verify", valid);

    return createResponse(
      "verify",
      valid,
      valid
        ? null
        : createManagerError(
            AUTHENTICATION_ERROR_CODES.TOKEN_INVALID,
            "Session verification failed."
          )
    );
  }

  async function logout(payload = {}) {
    ensureOpen();

    const session = currentSession;

    await execute("logout", {
      ...payload,
      session,
    });

    currentIdentity = null;
    currentSession = null;

    record("logout", true);

    return createResponse("logout", true);
  }

  async function refresh(payload = {}) {
    ensureOpen();

    if (!currentSession) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.SESSION_NOT_FOUND,
        "No active session exists."
      );
    }

    const result = await execute("refresh", {
      ...payload,
      session: currentSession,
    });

    if (result.success !== true) {
      currentIdentity = null;
      currentSession = null;

      record("refresh", false);

      return createResponse(
        "refresh",
        false,
        createManagerError(
          AUTHENTICATION_ERROR_CODES.TOKEN_EXPIRED,
          "Session refresh failed."
        )
      );
    }

    const session = normalizeSession(result.session);

    if (!session) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.PROVIDER_ERROR,
        "Provider returned an invalid refreshed session."
      );
    }

    currentSession = session;

    if (result.user !== undefined) {
      const identity = normalizeIdentity(result.user);

      if (!identity) {
        throw createManagerError(
          AUTHENTICATION_ERROR_CODES.PROVIDER_ERROR,
          "Provider returned an invalid identity."
        );
      }

      currentIdentity = identity;
    }

    record("refresh", true);

    return createResponse("refresh", true);
  }

  async function processRequest(request = {}) {
    ensureOpen();

    const validation = validateAuthenticationRequest(request);

    if (!validation.valid) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.INVALID_REQUEST,
        "Invalid authentication request.",
        validation.errors
      );
    }

    const { action, payload = {} } = request;

    switch (action) {
      case "authenticate":
        return authenticate(payload);

      case "verify":
        return verify(payload);

      case "logout":
        return logout(payload);

      case "refresh":
        return refresh(payload);

      case "getStatus":
        return getStatus();

      default:
        throw createManagerError(
          AUTHENTICATION_ERROR_CODES.INVALID_ACTION,
          "Unsupported authentication action."
        );
    }
  }

  function getStatus() {
    ensureOpen();

    return Object.freeze({
      version: AUTHENTICATION_MANAGER_VERSION,
      contractVersion: AUTHENTICATION_CONTRACT_VERSION,
      closed,
      authenticated: Boolean(currentIdentity && currentSession),
      userId: currentIdentity?.id ?? null,
      sessionId: currentSession?.id ?? null,
      historySize: history.length,
      operationInProgress,
    });
  }

  function getHistory() {
    ensureOpen();
    return Object.freeze([...history]);
  }

  function close() {
    if (closed) {
      return false;
    }

    if (operationInProgress) {
      throw createManagerError(
        AUTHENTICATION_ERROR_CODES.AUTHENTICATION_FAILED,
        "Cannot close while an operation is in progress."
      );
    }

    currentIdentity = null;
    currentSession = null;
    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    authenticate,
    verify,
    logout,
    refresh,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
