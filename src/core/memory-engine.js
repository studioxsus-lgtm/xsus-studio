/**
 * XSUS AI — Memory Engine
 * Version: 1.3.0
 *
 * Menaxhon sesionet, historikun dhe eksportimin/rikthimin
 * e bisedave në RAM.
 *
 * Karakteristikat:
 * - Sesione të izoluara.
 * - Kufizime për sesionet dhe mesazhet.
 * - Validim i të dhënave.
 * - Kopje të pavarura të të dhënave.
 * - Metadata me kopjim rekursiv.
 * - Historik kronologjik.
 * - Eksportim dhe rikthim i sesioneve.
 * - Pastrim dhe statistika të memories.
 * - Gjurmim i aktivitetit të fundit.
 * - Pastrim i sesioneve joaktive.
 *
 * Shënim:
 * Ky modul ruan të dhënat aktive në RAM.
 * Ruajtja në disk realizohet nga persistent-memory.js.
 */

export const MEMORY_ENGINE_VERSION = "1.3.0";

const MAX_SESSIONS = 1000;
const MAX_MESSAGES_PER_SESSION = 100;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_SESSION_ID_LENGTH = 128;

const ALLOWED_ROLES = new Set([
  "user",
  "assistant",
]);

const sessions = new Map();

function validateSessionId(sessionId) {
  if (typeof sessionId !== "string") {
    throw new Error("ID e sesionit nuk është e vlefshme.");
  }

  const normalizedId = sessionId.trim();

  if (
    !normalizedId ||
    normalizedId.length > MAX_SESSION_ID_LENGTH
  ) {
    throw new Error("ID e sesionit nuk është e vlefshme.");
  }

  return normalizedId;
}

function getSessionOrNull(sessionId) {
  if (typeof sessionId !== "string") {
    return null;
  }

  const normalizedId = sessionId.trim();

  if (!normalizedId) {
    return null;
  }

  return sessions.get(normalizedId) || null;
}

function updateLastAccessedAt(session) {
  session.lastAccessedAt = new Date().toISOString();
}

/**
 * Kopjon metadata-n, duke mbështetur objektet e zakonshme,
 * vargjet dhe referencat ciklike.
 */
function cloneMetadata(metadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  function cloneValue(value, seen = new WeakMap()) {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (seen.has(value)) {
      return seen.get(value);
    }

    if (Array.isArray(value)) {
      const copy = [];
      seen.set(value, copy);

      for (const item of value) {
        copy.push(cloneValue(item, seen));
      }

      return copy;
    }

    const prototype = Object.getPrototypeOf(value);

    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      return value;
    }

    const copy = {};
    seen.set(value, copy);

    for (const key of Object.keys(value)) {
      Object.defineProperty(copy, key, {
        value: cloneValue(value[key], seen),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }

    return copy;
  }

  return cloneValue(metadata);
}

/**
 * Krijon kopje të pavarur të mesazhit.
 */
function cloneMessage(message, includeMetadata = true) {
  const copy = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  };

  if (includeMetadata) {
    copy.metadata = cloneMetadata(message.metadata);
  }

  return copy;
}

function cloneSession(session) {
  return {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastAccessedAt:
      session.lastAccessedAt ??
      session.updatedAt ??
      session.createdAt,
    metadata: cloneMetadata(session.metadata),
    messages: session.messages.map((message) =>
      cloneMessage(message)
    ),
  };
}

function createMessageId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

/**
 * Valido dhe normalizon një mesazh nga snapshot-i.
 * ID-ja dhe timestamp-i origjinal ruhen.
 */
function validateSnapshotMessage(message) {
  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message)
  ) {
    throw new Error("Mesazh i pavlefshëm në snapshot.");
  }

  if (
    typeof message.id !== "string" ||
    !message.id.trim() ||
    message.id.length > 256
  ) {
    throw new Error("ID e mesazhit në snapshot nuk është e vlefshme.");
  }

  if (
    typeof message.role !== "string" ||
    !ALLOWED_ROLES.has(message.role)
  ) {
    throw new Error("Roli i mesazhit në snapshot nuk është i vlefshëm.");
  }

  if (
    typeof message.content !== "string" ||
    !message.content.trim() ||
    message.content.length > MAX_MESSAGE_LENGTH
  ) {
    throw new Error("Përmbajtja e mesazhit në snapshot nuk është e vlefshme.");
  }

  if (!isValidTimestamp(message.timestamp)) {
    throw new Error("Koha e mesazhit në snapshot nuk është e vlefshme.");
  }

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    metadata: cloneMetadata(message.metadata),
  };
}

/**
 * Krijon një sesion të ri.
 * Pranon një ID tekstuale ose objekt konfigurimi.
 */
export function createMemorySession(input) {
  const config =
    typeof input === "string"
      ? { sessionId: input }
      : input;

  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
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
    lastAccessedAt: now,
    metadata: cloneMetadata(config.metadata),
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
 * Kthen kopjen e sesionit dhe regjistron aktivitetin.
 */
export function getMemorySession(sessionId) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  updateLastAccessedAt(session);

  return cloneSession(session);
}

/**
 * Regjistron aktivitet pa ndryshuar updatedAt.
 */
export function touchMemorySession(sessionId) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  updateLastAccessedAt(session);

  return cloneSession(session);
}

/**
 * Shton një mesazh në historik.
 */
export function addMemoryMessage(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("Mesazhi nuk është i vlefshëm.");
  }

  const sessionId = validateSessionId(input.sessionId);
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error("Sesioni nuk ekziston.");
  }

  if (
    typeof input.role !== "string" ||
    !ALLOWED_ROLES.has(input.role)
  ) {
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

  const timestamp = new Date().toISOString();

  const message = {
    id: createMessageId(),
    role: input.role,
    content,
    timestamp,
    metadata: cloneMetadata(input.metadata),
  };

  session.messages.push(message);

  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    const excess =
      session.messages.length - MAX_MESSAGES_PER_SESSION;

    session.messages.splice(0, excess);
  }

  session.updatedAt = timestamp;
  session.lastAccessedAt = timestamp;

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

  updateLastAccessedAt(session);

  const requestedLimit =
    options &&
    typeof options === "object" &&
    !Array.isArray(options)
      ? options.limit
      : undefined;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit >= 0
      ? Math.min(requestedLimit, MAX_MESSAGES_PER_SESSION)
      : MAX_MESSAGES_PER_SESSION;

  if (limit === 0) {
    return [];
  }

  return session.messages
    .slice(-limit)
    .map((message) => cloneMessage(message));
}

/**
 * Kthen kontekstin e fundit pa metadata të mesazheve.
 */
export function getRecentMemoryContext(sessionId, limit = 20) {
  const safeLimit =
    Number.isInteger(limit) && limit >= 0
      ? Math.min(limit, MAX_MESSAGES_PER_SESSION)
      : 20;

  if (safeLimit === 0) {
    return [];
  }

  return getMemoryHistory(sessionId, {
    limit: safeLimit,
  }).map((message) => cloneMessage(message, false));
}

/**
 * Përditëson metadata-n e sesionit.
 */
export function updateMemorySessionMetadata(sessionId, metadata) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new Error("Metadata duhet të jetë objekt.");
  }

  session.metadata = cloneMetadata({
    ...session.metadata,
    ...metadata,
  });

  const now = new Date().toISOString();

  session.updatedAt = now;
  session.lastAccessedAt = now;

  return cloneSession(session);
}

/**
 * Pastron historikun pa fshirë sesionin.
 */
export function clearMemoryHistory(sessionId) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return {
      cleared: false,
      removedMessages: 0,
    };
  }

  const removedMessages = session.messages.length;

  session.messages = [];

  const now = new Date().toISOString();

  session.updatedAt = now;
  session.lastAccessedAt = now;

  return {
    cleared: true,
    removedMessages,
  };
}

/**
 * Fshin një sesion nga RAM.
 */
export function deleteMemorySession(sessionId) {
  const id = validateSessionId(sessionId);
  const deleted = sessions.delete(id);

  return { deleted };
}

/**
 * Eksporton një snapshot të plotë të sesionit.
 *
 * Snapshot-i është kopje e pavarur dhe nuk përmban
 * referenca të drejtpërdrejta te të dhënat e brendshme.
 */
export function exportMemorySession(sessionId) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  updateLastAccessedAt(session);

  return {
    schemaVersion: 1,
    engineVersion: MEMORY_ENGINE_VERSION,
    exportedAt: new Date().toISOString(),
    session: cloneSession(session),
  };
}

/**
 * Rikthen një snapshot të eksportuar më parë.
 *
 * - Nuk mbishkruan sesionet ekzistuese.
 * - Ruajt ID-të dhe timestamp-et origjinale.
 * - Validoi mesazhet dhe kufijtë përpara regjistrimit.
 * - Pranon snapshot-in e krijuar nga exportMemorySession().
 */
export function restoreMemorySession(sessionId, snapshot) {
  const normalizedId = validateSessionId(sessionId);

  if (sessions.has(normalizedId)) {
    throw new Error(`Sesioni ${normalizedId} ekziston tashmë.`);
  }

  if (sessions.size >= MAX_SESSIONS) {
    throw new Error("Është arritur kufiri i sesioneve.");
  }

  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    snapshot.schemaVersion !== 1 ||
    !snapshot.session ||
    typeof snapshot.session !== "object" ||
    Array.isArray(snapshot.session)
  ) {
    throw new Error("Snapshot-i i sesionit nuk është i vlefshëm.");
  }

  const source = snapshot.session;

  if (
    typeof source.sessionId !== "string" ||
    source.sessionId.trim() !== normalizedId
  ) {
    throw new Error("ID-ja në snapshot nuk përputhet me sesionin.");
  }

  if (
    !isValidTimestamp(source.createdAt) ||
    !isValidTimestamp(source.updatedAt) ||
    !isValidTimestamp(source.lastAccessedAt ?? source.updatedAt)
  ) {
    throw new Error("Kohët e sesionit në snapshot nuk janë të vlefshme.");
  }

  if (!Array.isArray(source.messages)) {
    throw new Error("Historiku në snapshot nuk është i vlefshëm.");
  }

  if (source.messages.length > MAX_MESSAGES_PER_SESSION) {
    throw new Error("Snapshot-i tejkalon numrin maksimal të mesazheve.");
  }

  const metadata =
    source.metadata &&
    typeof source.metadata === "object" &&
    !Array.isArray(source.metadata)
      ? cloneMetadata(source.metadata)
      : {};

  const messages = source.messages.map(validateSnapshotMessage);

  const messageIds = new Set();

  for (const message of messages) {
    if (messageIds.has(message.id)) {
      throw new Error("Snapshot-i përmban ID të përsëritura mesazhesh.");
    }

    messageIds.add(message.id);
  }

  const restoredSession = {
    sessionId: normalizedId,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    lastAccessedAt:
      source.lastAccessedAt ?? source.updatedAt,
    metadata,
    messages,
  };

  // Regjistrohet vetëm pasi të gjitha të dhënat janë validuar.
  sessions.set(normalizedId, restoredSession);

  return cloneSession(restoredSession);
}

/**
 * Pastron sesionet joaktive.
 */
export function cleanupExpiredMemorySessions({
  maxIdleMs,
  now = Date.now(),
} = {}) {
  if (!Number.isFinite(maxIdleMs) || maxIdleMs < 0) {
    throw new TypeError("maxIdleMs duhet të jetë numër jo negativ.");
  }

  if (!Number.isFinite(now)) {
    throw new TypeError("now duhet të jetë kohë e vlefshme.");
  }

  let removed = 0;

  for (const [sessionId, session] of sessions.entries()) {
    const lastActivity = Date.parse(
      session.lastAccessedAt ??
      session.updatedAt ??
      session.createdAt
    );

    if (!Number.isFinite(lastActivity)) {
      continue;
    }

    const idleTime = now - lastActivity;

    if (idleTime >= maxIdleMs && idleTime >= 0) {
      sessions.delete(sessionId);
      removed += 1;
    }
  }

  return {
    removed,
    remaining: sessions.size,
  };
}

/**
 * Kthen statistikat aktuale të memories.
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
