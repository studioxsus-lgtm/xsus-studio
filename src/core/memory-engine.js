/**
 * XSUS AI — Memory Engine
 * Version: 1.0.1
 *
 * Menaxhon sesionet dhe historikun e bisedave në RAM.
 */

export const MEMORY_ENGINE_VERSION = "1.0.1";

export const MEMORY_ROLES = Object.freeze([
  "system",
  "user",
  "assistant",
  "tool",
]);

export const MEMORY_LIMITS = Object.freeze({
  MAX_SESSIONS: 1000,
  MAX_MESSAGES_PER_SESSION: 100,
  MAX_MESSAGE_LENGTH: 8000,
  MAX_SESSION_ID_LENGTH: 128,
  MAX_METADATA_KEYS: 50,
});

const sessions = new Map();

function normalizeSessionId(value) {
  if (typeof value !== "string") {
    return null;
  }

  const id = value.trim();

  if (
    !id ||
    id.length > MEMORY_LIMITS.MAX_SESSION_ID_LENGTH
  ) {
    return null;
  }

  return id;
}

function normalizeMetadata(metadata = {}) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).slice(
      0,
      MEMORY_LIMITS.MAX_METADATA_KEYS
    )
  );
}

function cloneSession(session) {
  if (!session) {
    return null;
  }

  return {
    ...session,
    metadata: { ...session.metadata },
    messages: session.messages.map((message) => ({
      ...message,
      metadata: { ...message.metadata },
    })),
  };
}

/**
 * Krijon një sesion të ri.
 * Pranon createMemorySession("id") ose
 * createMemorySession({ sessionId: "id", metadata: {} }).
 */
export function createMemorySession(input, options = {}) {
  const config =
    typeof input === "string"
      ? { sessionId: input, metadata: options.metadata }
      : input && typeof input === "object" && !Array.isArray(input)
        ? input
        : {};

  const sessionId = normalizeSessionId(config.sessionId);

  if (!sessionId) {
    return null;
  }

  if (sessions.has(sessionId)) {
    return cloneSession(sessions.get(sessionId));
  }

  if (sessions.size >= MEMORY_LIMITS.MAX_SESSIONS) {
    return null;
  }

  const now = new Date().toISOString();

  const session = {
    sessionId,
    createdAt: now,
    updatedAt: now,
    metadata: normalizeMetadata(config.metadata),
    messages: [],
  };

  sessions.set(sessionId, session);

  return cloneSession(session);
}

/**
 * Kontrollon nëse ekziston sesioni.
 */
export function hasMemorySession(sessionId) {
  const id = normalizeSessionId(sessionId);
  return id !== null && sessions.has(id);
}

/**
 * Merr një kopje të sesionit.
 */
export function getMemorySession(sessionId) {
  const id = normalizeSessionId(sessionId);

  if (!id) {
    return null;
  }

  return cloneSession(sessions.get(id));
}

/**
 * Shton një mesazh në historik.
 * Pranon një objekt ose parametrat sessionId, role, content.
 */
export function addMemoryMessage(input, role, content, metadata = {}) {
  const config =
    input && typeof input === "object" && !Array.isArray(input)
      ? input
      : {
          sessionId: input,
          role,
          content,
          metadata,
        };

  const sessionId = normalizeSessionId(config.sessionId);

  if (!sessionId || !sessions.has(sessionId)) {
    return null;
  }

  if (!MEMORY_ROLES.includes(config.role)) {
    return null;
  }

  if (
    typeof config.content !== "string" ||
    !config.content.trim()
  ) {
    return null;
  }

  const cleanContent = config.content.trim();

  if (cleanContent.length > MEMORY_LIMITS.MAX_MESSAGE_LENGTH) {
    return null;
  }

  const session = sessions.get(sessionId);
  const now = new Date().toISOString();

  const message = {
    role: config.role,
    content: cleanContent,
    timestamp: now,
    metadata: normalizeMetadata(config.metadata),
  };

  session.messages.push(message);

  if (
    session.messages.length >
    MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION
  ) {
    session.messages.splice(
      0,
      session.messages.length -
        MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION
    );
  }

  session.updatedAt = now;

  return { ...message, metadata: { ...message.metadata } };
}

/**
 * Merr historikun e sesionit.
 */
export function getMemoryHistory(sessionId, options = {}) {
  const id = normalizeSessionId(sessionId);

  if (!id || !sessions.has(id)) {
    return [];
  }

  const limit =
    typeof options.limit === "number" &&
    Number.isInteger(options.limit) &&
    options.limit >= 0
      ? options.limit
      : MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION;

  return sessions
    .get(id)
    .messages.slice(-limit)
    .map((message) => ({
      ...message,
      metadata: { ...message.metadata },
    }));
}

/**
 * Kthen kontekstin e mesazheve të fundit.
 */
export function getRecentMemoryContext(sessionId, limit = 20) {
  const safeLimit =
    Number.isInteger(limit) && limit >= 0 ? limit : 20;

  return getMemoryHistory(sessionId, { limit: safeLimit });
}

/**
 * Përditëson metadata-n e sesionit.
 */
export function updateMemorySessionMetadata(sessionId, metadata) {
  const id = normalizeSessionId(sessionId);

  if (!id || !sessions.has(id)) {
    return null;
  }

  const session = sessions.get(id);

  session.metadata = {
    ...session.metadata,
    ...normalizeMetadata(metadata),
  };

  session.updatedAt = new Date().toISOString();

  return cloneSession(session);
}

/**
 * Fshin historikun, por ruan sesionin.
 */
export function clearMemoryHistory(sessionId) {
  const id = normalizeSessionId(sessionId);

  if (!id || !sessions.has(id)) {
    return false;
  }

  const session = sessions.get(id);
  session.messages = [];
  session.updatedAt = new Date().toISOString();

  return true;
}

/**
 * Fshin një sesion.
 */
export function deleteMemorySession(sessionId) {
  const id = normalizeSessionId(sessionId);

  if (!id) {
    return false;
  }

  return sessions.delete(id);
}

/**
 * Kthen statistikat e memories.
 */
export function getMemoryStats() {
  let totalMessages = 0;

  for (const session of sessions.values()) {
    totalMessages += session.messages.length;
  }

  return {
    sessionCount: sessions.size,
    totalMessages,
    maxSessions: MEMORY_LIMITS.MAX_SESSIONS,
    maxMessagesPerSession:
      MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION,
    version: MEMORY_ENGINE_VERSION,
  };
}

/**
 * Fshin të gjitha sesionet nga RAM.
 */
export function clearAllMemory() {
  const removedSessions = sessions.size;
  sessions.clear();

  return {
    removedSessions,
    cleared: true,
  };
}
