/**
 * XSUS AI — Memory Engine
 * Version: 1.0.0
 *
 * Menaxhon sesionet dhe historikun e bisedave në RAM.
 */

export const MEMORY_ENGINE_VERSION = "1.0.0";

const MAX_SESSIONS = 1000;
const MAX_MESSAGES_PER_SESSION = 100;
const MAX_MESSAGE_LENGTH = 8000;

const sessions = new Map();

function validateSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    !sessionId.trim() ||
    sessionId.length > 128
  ) {
    throw new Error("ID e sesionit nuk është e vlefshme.");
  }

  return sessionId.trim();
}

function getSessionOrNull(sessionId) {
  if (typeof sessionId !== "string") {
    return null;
  }

  return sessions.get(sessionId.trim()) || null;
}

function cloneMessage(message, includeMetadata = true) {
  const copy = { ...message };

  if (!includeMetadata) {
    delete copy.metadata;
  } else {
    copy.metadata = { ...message.metadata };
  }

  return copy;
}

function cloneSession(session) {
  return {
    ...session,
    metadata: { ...session.metadata },
    messages: session.messages.map((message) =>
      cloneMessage(message)
    ),
  };
}

/**
 * Krijon një sesion të ri.
 * Refuzon ID-të e përsëritura.
 */
export function createMemorySession(input) {
  const config =
    typeof input === "string"
      ? { sessionId: input }
      : input;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Konfigurimi i sesionit nuk është i vlefshëm.");
  }

  const sessionId = validateSessionId(config.sessionId);

  if (sessions.has(sessionId)) {
    throw new Error(`Sesioni ${sessionId} ekziston tashmë.`);
  }

  if (sessions.size >= MAX_SESSIONS) {
    throw new Error("Është arritur kufiri i sesioneve.");
  }

  const now = new Date().toISOString();

  const session = {
    sessionId,
    createdAt: now,
    updatedAt: now,
    metadata:
      config.metadata &&
      typeof config.metadata === "object" &&
      !Array.isArray(config.metadata)
        ? { ...config.metadata }
        : {},
    messages: [],
  };

  sessions.set(sessionId, session);

  return cloneSession(session);
}

/**
 * Kontrollon nëse ekziston sesioni.
 */
export function hasMemorySession(sessionId) {
  return getSessionOrNull(sessionId) !== null;
}

/**
 * Kthen kopjen e sesionit ose null.
 */
export function getMemorySession(sessionId) {
  const session = getSessionOrNull(sessionId);

  return session ? cloneSession(session) : null;
}

/**
 * Shton një mesazh në historik.
 * Rolet e lejuara: user dhe assistant.
 */
export function addMemoryMessage(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Mesazhi nuk është i vlefshëm.");
  }

  const sessionId = validateSessionId(input.sessionId);
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Sesioni nuk ekziston.");
  }

  if (!["user", "assistant"].includes(input.role)) {
    throw new Error("Roli duhet të jetë user ose assistant.");
  }

  if (
    typeof input.content !== "string" ||
    !input.content.trim()
  ) {
    throw new Error("Mesazhi duhet të përmbajë tekst jo bosh.");
  }

  const content = input.content.trim();

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Mesazhi tejkalon gjatësinë e lejuar.");
  }

  const message = {
    id:
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: input.role,
    content,
    timestamp: new Date().toISOString(),
    metadata:
      input.metadata &&
      typeof input.metadata === "object" &&
      !Array.isArray(input.metadata)
        ? { ...input.metadata }
        : {},
  };

  session.messages.push(message);

  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.splice(
      0,
      session.messages.length - MAX_MESSAGES_PER_SESSION
    );
  }

  session.updatedAt = message.timestamp;

  return cloneMessage(message);
}

/**
 * Merr historikun në rend kronologjik.
 */
export function getMemoryHistory(sessionId, options = {}) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return [];
  }

  const limit =
    Number.isInteger(options.limit) && options.limit >= 0
      ? options.limit
      : MAX_MESSAGES_PER_SESSION;

  return session.messages
    .slice(-limit)
    .map((message) => cloneMessage(message));
}

/**
 * Kthen kontekstin e fundit pa metadata.
 */
export function getRecentMemoryContext(sessionId, limit = 20) {
  const history = getMemoryHistory(sessionId, { limit });

  return history.map((message) => cloneMessage(message, false));
}

/**
 * Përditëson metadata-n e sesionit.
 */
export function updateMemorySessionMetadata(sessionId, metadata) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Metadata duhet të jetë objekt.");
  }

  session.metadata = {
    ...session.metadata,
    ...metadata,
  };

  session.updatedAt = new Date().toISOString();

  return cloneSession(session);
}

/**
 * Pastron historikun dhe raporton numrin e mesazheve të fshira.
 */
export function clearMemoryHistory(sessionId) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return { cleared: false, removedMessages: 0 };
  }

  const removedMessages = session.messages.length;
  session.messages = [];
  session.updatedAt = new Date().toISOString();

  return {
    cleared: true,
    removedMessages,
  };
}

/**
 * Fshin një sesion dhe raporton rezultatin.
 */
export function deleteMemorySession(sessionId) {
  const id = validateSessionId(sessionId);
  const deleted = sessions.delete(id);

  return { deleted };
}

/**
 * Kthen statistikat aktuale.
 */
export function getMemoryStats() {
  let totalMessages = 0;

  for (const session of sessions.values()) {
    totalMessages += session.messages.length;
  }

  return {
    activeSessions: sessions.size,
    totalMessages,
    maxSessions: MAX_SESSIONS,
    maxMessagesPerSession: MAX_MESSAGES_PER_SESSION,
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
