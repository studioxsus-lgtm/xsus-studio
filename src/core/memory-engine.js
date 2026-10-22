
/**
 * XSUS AI — Memory Engine
 * Version: 1.0.1
 *
 * Menaxhon sesionet dhe historikun e bisedave në RAM.
 *
 * Karakteristikat:
 * - Sesione të izoluara.
 * - Kufizime për numrin e sesioneve dhe mesazheve.
 * - Validim i mesazheve dhe roleve.
 * - Kopje të pavarura të të dhënave.
 * - Metadata me kopjim rekursiv.
 * - Historik kronologjik.
 * - Pastrim dhe statistika të memories.
 *
 * Shënim:
 * Memoria ruhet vetëm në RAM dhe humbet kur procesi
 * përfundon ose moduli rivendoset.
 */

export const MEMORY_ENGINE_VERSION = "1.0.1";

const MAX_SESSIONS = 1000;
const MAX_MESSAGES_PER_SESSION = 100;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_SESSION_ID_LENGTH = 128;

const ALLOWED_ROLES = new Set([
  "user",
  "assistant",
]);

const sessions = new Map();

/**
 * Kontrollon dhe normalizon ID-në e sesionit.
 */
function validateSessionId(sessionId) {
  if (typeof sessionId !== "string") {
    throw new Error(
      "ID e sesionit nuk është e vlefshme."
    );
  }

  const normalizedId = sessionId.trim();

  if (
    !normalizedId ||
    normalizedId.length > MAX_SESSION_ID_LENGTH
  ) {
    throw new Error(
      "ID e sesionit nuk është e vlefshme."
    );
  }

  return normalizedId;
}

/**
 * Kthen sesionin e brendshëm ose null.
 */
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

/**
 * Krijon një kopje të pavarur të metadata-s.
 *
 * Mbështet:
 * - Vlera primitive.
 * - Objekte të zakonshme.
 * - Vargje.
 * - Referenca ciklike.
 *
 * Objektet me prototipe të posaçme nuk kopjohen
 * automatikisht, për të shmangur sjellje të papritura.
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
      // Nuk ndajmë automatikisht prototipe të posaçme.
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
 * Krijon një kopje të mesazhit.
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

/**
 * Krijon një kopje të plotë të sesionit.
 */
function cloneSession(session) {
  return {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    metadata: cloneMetadata(session.metadata),
    messages: session.messages.map(message =>
      cloneMessage(message)
    ),
  };
}

/**
 * Krijon një identifikues unik për mesazhin.
 */
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

/**
 * Krijon një sesion të ri.
 *
 * Pranon:
 * - Një ID tekstuale.
 * - Një objekt konfigurimi me sessionId.
 *
 * Refuzon ID-të e përsëritura.
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
    throw new Error(
      "Konfigurimi i sesionit nuk është i vlefshëm."
    );
  }

  const sessionId = validateSessionId(config.sessionId);

  if (sessions.has(sessionId)) {
    throw new Error(
      `Sesioni ${sessionId} ekziston tashmë.`
    );
  }

  if (sessions.size >= MAX_SESSIONS) {
    throw new Error(
      "Është arritur kufiri i sesioneve."
    );
  }

  const now = new Date().toISOString();

  const session = {
    sessionId,
    createdAt: now,
    updatedAt: now,
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
 * Kthen një kopje të sesionit ose null.
 */
export function getMemorySession(sessionId) {
  const session = getSessionOrNull(sessionId);

  return session ? cloneSession(session) : null;
}

/**
 * Shton një mesazh në historik.
 *
 * Rolet e lejuara:
 * - user
 * - assistant
 */
export function addMemoryMessage(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error(
      "Mesazhi nuk është i vlefshëm."
    );
  }

  const sessionId = validateSessionId(input.sessionId);
  const session = sessions.get(sessionId);

  if (!session) {
    throw new Error(
      "Sesioni nuk ekziston."
    );
  }

  if (
    typeof input.role !== "string" ||
    !ALLOWED_ROLES.has(input.role)
  ) {
    throw new Error(
      "Roli duhet të jetë user ose assistant."
    );
  }

  if (
    typeof input.content !== "string" ||
    !input.content.trim()
  ) {
    throw new Error(
      "Mesazhi duhet të përmbajë tekst jo bosh."
    );
  }

  const content = input.content.trim();

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      "Mesazhi tejkalon gjatësinë e lejuar."
    );
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

  // Mbajmë vetëm mesazhet më të fundit.
  if (
    session.messages.length >
    MAX_MESSAGES_PER_SESSION
  ) {
    const excess =
      session.messages.length -
      MAX_MESSAGES_PER_SESSION;

    session.messages.splice(0, excess);
  }

  session.updatedAt = timestamp;

  return cloneMessage(message);
}

/**
 * Merr historikun në rend kronologjik.
 *
 * options.limit:
 * - Numër pozitiv: kthen mesazhet e fundit.
 * - 0: kthen listë bosh.
 * - I pavlefshëm ose i munguar: përdor kufirin maksimal.
 */
export function getMemoryHistory(
  sessionId,
  options = {}
) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return [];
  }

  const requestedLimit =
    options &&
    typeof options === "object" &&
    !Array.isArray(options)
      ? options.limit
      : undefined;

  const limit =
    Number.isInteger(requestedLimit) &&
    requestedLimit >= 0
      ? Math.min(
          requestedLimit,
          MAX_MESSAGES_PER_SESSION
        )
      : MAX_MESSAGES_PER_SESSION;

  if (limit === 0) {
    return [];
  }

  return session.messages
    .slice(-limit)
    .map(message => cloneMessage(message));
}

/**
 * Kthen kontekstin e fundit pa metadata.
 */
export function getRecentMemoryContext(
  sessionId,
  limit = 20
) {
  const safeLimit =
    Number.isInteger(limit) && limit >= 0
      ? Math.min(
          limit,
          MAX_MESSAGES_PER_SESSION
        )
      : 20;

  if (safeLimit === 0) {
    return [];
  }

  return getMemoryHistory(sessionId, {
    limit: safeLimit,
  }).map(message =>
    cloneMessage(message, false)
  );
}

/**
 * Përditëson metadata-n e sesionit.
 */
export function updateMemorySessionMetadata(
  sessionId,
  metadata
) {
  const session = getSessionOrNull(sessionId);

  if (!session) {
    return null;
  }

  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new Error(
      "Metadata duhet të jetë objekt."
    );
  }

  session.metadata = cloneMetadata({
    ...session.metadata,
    ...metadata,
  });

  session.updatedAt = new Date().toISOString();

  return cloneSession(session);
}

/**
 * Pastron historikun dhe raporton numrin e mesazheve
 * të fshira.
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
  session.updatedAt = new Date().toISOString();

  return {
    cleared: true,
    removedMessages,
  };
}

/**
 * Fshin një sesion.
 */
export function deleteMemorySession(sessionId) {
  const id = validateSessionId(sessionId);
  const deleted = sessions.delete(id);

  return { deleted };
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
