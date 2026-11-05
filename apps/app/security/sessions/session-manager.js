
/**
 * XSUS App — Session Manager
 * Version: 1.0.0
 *
 * Ruajtja: RAM.
 * Koha dhe ID generator mund të injektohen për testim.
 */

import { randomUUID } from "node:crypto";

import {
  SESSION_ERROR_CODES,
  createSessionError,
  validateSessionConfig,
  validateSessionRequest,
} from "./session-contracts.js";

export const SESSION_MANAGER_VERSION = "1.0.0";

export function createSessionManager(options = {}) {
  const config = validateSessionConfig(options.config ?? {});
  const now = typeof options.now === "function"
    ? options.now
    : () => Date.now();

  const generateId = typeof options.idGenerator === "function"
    ? options.idGenerator
    : randomUUID;

  const sessions = new Map();
  const history = [];
  let closed = false;

  function ensureOpen() {
    if (closed) {
      throw createSessionError(
        SESSION_ERROR_CODES.ALREADY_CLOSED,
        "Session manager is closed.",
      );
    }
  }

  function record(event, details = {}) {
    history.push(Object.freeze({
      event,
      timestamp: new Date(now()).toISOString(),
      ...details,
    }));

    if (history.length > 200) history.shift();
  }

  function publicSession(session) {
    return Object.freeze({
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      status: session.status,
      metadata: Object.freeze({ ...session.metadata }),
    });
  }

  function expireSession(session) {
    if (session.status !== "active") return false;
    if (now() < session.expiresAt) return false;

    session.status = "expired";
    record("session.expired", {
      sessionId: session.id,
      userId: session.userId,
    });

    return true;
  }

  function expireAll() {
    for (const session of sessions.values()) {
      expireSession(session);
    }
  }

  function getStoredSession(sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_NOT_FOUND,
        "Session not found.",
        { sessionId },
      );
    }

    expireSession(session);
    return session;
  }

  function createSession(userId, metadata = {}) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "createSession",
      userId,
      metadata,
    });

    expireAll();

    const userSessions = [...sessions.values()].filter(
      (session) =>
        session.userId === request.userId &&
        session.status === "active",
    );

    if (sessions.size >= config.maxSessions) {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_LIMIT_REACHED,
        "Maximum global session limit reached.",
      );
    }

    if (userSessions.length >= config.maxSessionsPerUser) {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_LIMIT_REACHED,
        "Maximum sessions per user reached.",
        { userId: request.userId },
      );
    }

    const id = generateId();

    if (
      typeof id !== "string" ||
      !id.trim() ||
      sessions.has(id)
    ) {
      throw createSessionError(
        SESSION_ERROR_CODES.INVALID_SESSION,
        "Session ID generator returned an invalid or duplicate ID.",
      );
    }

    const timestamp = now();

    const session = {
      id,
      userId: request.userId,
      createdAt: timestamp,
      expiresAt: timestamp + config.sessionDurationMs,
      lastActivityAt: timestamp,
      status: "active",
      metadata: { ...request.metadata },
    };

    sessions.set(id, session);

    record("session.created", {
      sessionId: id,
      userId: request.userId,
    });

    return publicSession(session);
  }

  function getSession(sessionId) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "getSession",
      sessionId,
    });

    const session = getStoredSession(request.sessionId);
    return publicSession(session);
  }

  function verifySession(sessionId) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "verifySession",
      sessionId,
    });

    const session = getStoredSession(request.sessionId);

    if (session.status === "expired") {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_EXPIRED,
        "Session has expired.",
        { sessionId: session.id },
      );
    }

    if (session.status === "revoked") {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_REVOKED,
        "Session has been revoked.",
        { sessionId: session.id },
      );
    }

    session.lastActivityAt = now();

    record("session.verified", {
      sessionId: session.id,
      userId: session.userId,
    });

    return Object.freeze({
      valid: true,
      session: publicSession(session),
    });
  }

  function refreshSession(sessionId) {
    ensureOpen();

    if (!config.allowRefresh) {
      throw createSessionError(
        SESSION_ERROR_CODES.INVALID_REQUEST,
        "Session refresh is disabled.",
      );
    }

    const request = validateSessionRequest({
      action: "refreshSession",
      sessionId,
    });

    const session = getStoredSession(request.sessionId);

    if (session.status === "expired") {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_EXPIRED,
        "Expired sessions cannot be refreshed.",
        { sessionId: session.id },
      );
    }

    if (session.status === "revoked") {
      throw createSessionError(
        SESSION_ERROR_CODES.SESSION_REVOKED,
        "Revoked sessions cannot be refreshed.",
        { sessionId: session.id },
      );
    }

    const timestamp = now();

    session.expiresAt = timestamp + config.sessionDurationMs;
    session.lastActivityAt = timestamp;

    record("session.refreshed", {
      sessionId: session.id,
      userId: session.userId,
    });

    return publicSession(session);
  }

  function revokeSession(sessionId) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "revokeSession",
      sessionId,
    });

    const session = getStoredSession(request.sessionId);

    if (session.status === "revoked") {
      return false;
    }

    session.status = "revoked";

    record("session.revoked", {
      sessionId: session.id,
      userId: session.userId,
    });

    return true;
  }

  function revokeUserSessions(userId) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "revokeUserSessions",
      userId,
    });

    let revokedCount = 0;

    for (const session of sessions.values()) {
      if (
        session.userId === request.userId &&
        session.status === "active"
      ) {
        session.status = "revoked";
        revokedCount += 1;

        record("session.revoked", {
          sessionId: session.id,
          userId: session.userId,
        });
      }
    }

    return revokedCount;
  }

  function listUserSessions(userId) {
    ensureOpen();

    const request = validateSessionRequest({
      action: "listUserSessions",
      userId,
    });

    expireAll();

    return Object.freeze(
      [...sessions.values()]
        .filter((session) => session.userId === request.userId)
        .map(publicSession),
    );
  }

  function getStatus() {
    ensureOpen();
    expireAll();

    let activeCount = 0;
    let expiredCount = 0;
    let revokedCount = 0;

    for (const session of sessions.values()) {
      if (session.status === "active") activeCount += 1;
      if (session.status === "expired") expiredCount += 1;
      if (session.status === "revoked") revokedCount += 1;
    }

    return Object.freeze({
      version: SESSION_MANAGER_VERSION,
      closed,
      totalSessions: sessions.size,
      activeCount,
      expiredCount,
      revokedCount,
      historyCount: history.length,
    });
  }

  function getHistory() {
    ensureOpen();
    return Object.freeze([...history]);
  }

  function processRequest(request = {}) {
    ensureOpen();

    const validated = validateSessionRequest(request);

    switch (validated.action) {
      case "createSession":
        return createSession(validated.userId, validated.metadata);

      case "getSession":
        return getSession(validated.sessionId);

      case "verifySession":
        return verifySession(validated.sessionId);

      case "refreshSession":
        return refreshSession(validated.sessionId);

      case "revokeSession":
        return revokeSession(validated.sessionId);

      case "revokeUserSessions":
        return revokeUserSessions(validated.userId);

      case "listUserSessions":
        return listUserSessions(validated.userId);

      case "getStatus":
        return getStatus();

      default:
        throw createSessionError(
          SESSION_ERROR_CODES.INVALID_ACTION,
          "Unsupported session action.",
        );
    }
  }

  function close() {
    if (closed) return false;

    sessions.clear();
    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    createSession,
    getSession,
    verifySession,
    refreshSession,
    revokeSession,
    revokeUserSessions,
    listUserSessions,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
