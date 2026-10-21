/**
 * XSUS AI Core — Memory Engine
 * Version: 1.0.0
 *
 * Menaxhon memorien e sesioneve dhe historikun e bisedave.
 * Memoria ruhet përkohësisht në RAM gjatë ekzekutimit.
 *
 * Karakteristikat:
 * - Krijimi dhe menaxhimi i sesioneve
 * - Ruajtja e mesazheve user/assistant
 * - Kufizimi i historikut
 * - Validimi dhe normalizimi i të dhënave
 * - Kopje të sigurta të të dhënave të lexuara
 * - Fshirja e sesioneve dhe pastrimi i memories
 */

export const MEMORY_ENGINE_VERSION = "1.0.0";

export const MEMORY_ROLES = Object.freeze([
  "user",
  "assistant",
]);

export const MEMORY_LIMITS = Object.freeze({
  MAX_SESSIONS: 1000,
  MAX_MESSAGES_PER_SESSION: 100,
  MAX_MESSAGE_LENGTH: 8000,
  MAX_SESSION_ID_LENGTH: 128,
  MAX_METADATA_KEYS: 50,
});

const sessions = new Map();

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    !sessionId.trim()
  ) {
    throw new TypeError(
      "ID-ja e sesionit duhet të jetë tekst jo bosh."
    );
  }

  const normalized = sessionId.trim();

  if (
    normalized.length >
    MEMORY_LIMITS.MAX_SESSION_ID_LENGTH
  ) {
    throw new RangeError(
      "ID-ja e sesionit është shumë e gjatë."
    );
  }

  return normalized;
}

function normalizeRole(role) {
  if (
    typeof role !== "string" ||
    !MEMORY_ROLES.includes(role.trim().toLowerCase())
  ) {
    throw new TypeError(
      "Roli duhet të jetë 'user' ose 'assistant'."
    );
  }

  return role.trim().toLowerCase();
}

function normalizeContent(content) {
  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    throw new TypeError(
      "Përmbajtja e mesazhit duhet të jetë tekst jo bosh."
    );
  }

  const normalized = content.trim();

  if (
    normalized.length >
    MEMORY_LIMITS.MAX_MESSAGE_LENGTH
  ) {
    throw new RangeError(
      "Mesazhi tejkalon kufirin e lejuar të karaktereve."
    );
  }

  return normalized;
}

function normalizeMetadata(metadata = {}) {
  if (!isPlainObject(metadata)) {
    throw new TypeError(
      "Metadata duhet të jetë objekt i vlefshëm."
    );
  }

  const keys = Object.keys(metadata);

  if (keys.length > MEMORY_LIMITS.MAX_METADATA_KEYS) {
    throw new RangeError(
      "Metadata përmban shumë fusha."
    );
  }

  try {
    const serialized = JSON.stringify(metadata);

    if (serialized === undefined) {
      throw new TypeError();
    }

    return JSON.parse(serialized);
  } catch {
    throw new TypeError(
      "Metadata duhet të përmbajë vetëm të dhëna JSON të vlefshme."
    );
  }
}

function createMessageId() {
  if (
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createSessionRecord(sessionId, metadata = {}) {
  const now = new Date().toISOString();

  return {
    sessionId,
    messages: [],
    metadata: normalizeMetadata(metadata),
    createdAt: now,
    updatedAt: now,
  };
}

function requireSession(sessionId) {
  const id = normalizeSessionId(sessionId);
  const session = sessions.get(id);

  if (!session) {
    throw new Error(
      `Sesioni '${id}' nuk u gjet.`
    );
  }

  return session;
}

function cloneMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    metadata: structuredCloneSafe(message.metadata),
  };
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneSession(session) {
  return {
    sessionId: session.sessionId,
    messages: session.messages.map(cloneMessage),
    metadata: structuredCloneSafe(session.metadata),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Krijon një sesion të ri.
 */
export function createMemorySession({
  sessionId,
  metadata = {},
} = {}) {
  const id = normalizeSessionId(sessionId);

  if (sessions.has(id)) {
    throw new Error(
      `Sesioni '${id}' ekziston tashmë.`
    );
  }

  if (sessions.size >= MEMORY_LIMITS.MAX_SESSIONS) {
    throw new RangeError(
      "Është arritur kufiri maksimal i sesioneve."
    );
  }

  const session = createSessionRecord(id, metadata);

  sessions.set(id, session);

  return cloneSession(session);
}

/**
 * Kontrollon nëse ekziston një sesion.
 */
export function hasMemorySession(sessionId) {
  const id = normalizeSessionId(sessionId);

  return sessions.has(id);
}

/**
 * Merr një kopje të sesionit.
 */
export function getMemorySession(sessionId) {
  const session = requireSession(sessionId);

  return cloneSession(session);
}

/**
 * Shton një mesazh në historikun e sesionit.
 */
export function addMemoryMessage({
  sessionId,
  role,
  content,
  metadata = {},
} = {}) {
  const session = requireSession(sessionId);

  const normalizedRole = normalizeRole(role);
  const normalizedContent = normalizeContent(content);
  const normalizedMetadata = normalizeMetadata(metadata);

  const message = {
    id: createMessageId(),
    role: normalizedRole,
    content: normalizedContent,
    timestamp: new Date().toISOString(),
    metadata: normalizedMetadata,
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

  session.updatedAt = new Date().toISOString();

  return cloneMessage(message);
}

/**
 * Merr historikun e sesionit.
 * limit përcakton numrin maksimal të mesazheve të fundit.
 */
export function getMemoryHistory(
  sessionId,
  { limit = MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION } = {}
) {
  const session = requireSession(sessionId);

  if (
    !Number.isInteger(limit) ||
    limit < 0
  ) {
    throw new TypeError(
      "Limit duhet të jetë numër i plotë jo negativ."
    );
  }

  const safeLimit = Math.min(
    limit,
    MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION
  );

  if (safeLimit === 0) {
    return [];
  }

  return session.messages
    .slice(-safeLimit)
    .map(cloneMessage);
}

/**
 * Kthen vetëm mesazhet e fundit për kontekstin e AI-së.
 */
export function getRecentMemoryContext(
  sessionId,
  limit = 20
) {
  return getMemoryHistory(sessionId, { limit }).map(
    ({ role, content, timestamp }) => ({
      role,
      content,
      timestamp,
    })
  );
}

/**
 * Përditëson metadata-n e sesionit.
 */
export function updateMemorySessionMetadata(
  sessionId,
  metadata
) {
  const session = requireSession(sessionId);

  if (!isPlainObject(metadata)) {
    throw new TypeError(
      "Metadata duhet të jetë objekt i vlefshëm."
    );
  }

  const updatedMetadata = normalizeMetadata({
    ...session.metadata,
    ...metadata,
  });

  session.metadata = updatedMetadata;
  session.updatedAt = new Date().toISOString();

  return cloneSession(session);
}

/**
 * Fshin të gjitha mesazhet e një sesioni.
 */
export function clearMemoryHistory(sessionId) {
  const session = requireSession(sessionId);

  const removedMessages = session.messages.length;

  session.messages = [];
  session.updatedAt = new Date().toISOString();

  return {
    sessionId: session.sessionId,
    removedMessages,
    cleared: true,
  };
}

/**
 * Fshin një sesion dhe historikun e tij nga RAM.
 */
export function deleteMemorySession(sessionId) {
  const id = normalizeSessionId(sessionId);
  const existed = sessions.delete(id);

  return {
    sessionId: id,
    deleted: existed,
  };
}

/**
 * Kthen informacion për sesionet aktive.
 */
export function getMemoryStats() {
  let totalMessages = 0;

  for (const session of sessions.values()) {
    totalMessages += session.messages.length;
  }

  return {
    version: MEMORY_ENGINE_VERSION,
    activeSessions: sessions.size,
    totalMessages,
    maxSessions: MEMORY_LIMITS.MAX_SESSIONS,
    maxMessagesPerSession:
      MEMORY_LIMITS.MAX_MESSAGES_PER_SESSION,
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
