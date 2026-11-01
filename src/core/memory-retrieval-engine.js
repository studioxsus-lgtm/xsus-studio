/**
 * XSUS AI — Intelligent Memory Retrieval Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kërkimi lokal në memorien aktive.
 * - Normalizimi dhe tokenizimi i kërkesave.
 * - Vlerësimi deterministik i relevancës.
 * - Renditja e kujtimeve.
 * - Përzgjedhja e kontekstit për AI.
 * - Indeksimi lokal në RAM.
 *
 * Nuk përdor API të jashtme ose internet.
 */

import {
  listMemorySessions,
  getMemoryHistory,
} from "./memory-engine.js";

export const MEMORY_RETRIEVAL_ENGINE_VERSION = "1.0.0";

const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS = 100;
const DEFAULT_MIN_SCORE = 0;
const MAX_QUERY_LENGTH = 8000;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but",
  "by", "for", "from", "had", "has", "have", "he",
  "her", "here", "him", "his", "i", "if", "in",
  "into", "is", "it", "its", "me", "my", "of",
  "on", "or", "our", "she", "so", "that", "the",
  "their", "them", "there", "they", "this", "to",
  "was", "we", "were", "what", "when", "where",
  "which", "who", "will", "with", "you", "your",

  "dhe", "e", "edhe", "është", "jam", "janë",
  "ka", "kam", "ke", "kemi", "kanë", "ky", "kjo",
  "këto", "këtë", "me", "më", "në", "nga", "për",
  "por", "që", "si", "te", "të", "u", "unë",
  "ju", "ne", "ata", "ato", "ai", "ajo",
  "çfarë", "kur", "ku", "kush", "do",
]);

function validateQuery(query) {
  if (typeof query !== "string") {
    throw new TypeError("Kërkesa e kërkimit duhet të jetë tekst.");
  }

  const normalized = query.trim();

  if (!normalized) {
    throw new Error("Kërkesa e kërkimit nuk mund të jetë bosh.");
  }

  if (normalized.length > MAX_QUERY_LENGTH) {
    throw new Error("Kërkesa e kërkimit është shumë e gjatë.");
  }

  return normalized;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .filter((token) => (
      token.length > 1 &&
      !STOP_WORDS.has(token)
    ));
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

function validateOptions(options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Opsionet e kërkimit nuk janë të vlefshme.");
  }

  const maxResults =
    options.limit === undefined
      ? DEFAULT_MAX_RESULTS
      : options.limit;

  if (
    !Number.isInteger(maxResults) ||
    maxResults < 0 ||
    maxResults > MAX_RESULTS
  ) {
    throw new RangeError(
      `limit duhet të jetë numër nga 0 deri në ${MAX_RESULTS}.`
    );
  }

  const minScore =
    options.minScore === undefined
      ? DEFAULT_MIN_SCORE
      : options.minScore;

  if (
    typeof minScore !== "number" ||
    !Number.isFinite(minScore) ||
    minScore < 0
  ) {
    throw new RangeError("minScore duhet të jetë numër jo negativ.");
  }

  if (
    options.sessionId !== undefined &&
    (
      typeof options.sessionId !== "string" ||
      !options.sessionId.trim()
    )
  ) {
    throw new TypeError("sessionId nuk është i vlefshëm.");
  }

  if (
    options.role !== undefined &&
    !["user", "assistant"].includes(options.role)
  ) {
    throw new TypeError("Roli i kërkimit nuk është i vlefshëm.");
  }

  return {
    limit: maxResults,
    minScore,
    sessionId: options.sessionId?.trim(),
    role: options.role,
    includeMetadata: options.includeMetadata === true,
    includeContent: options.includeContent !== false,
  };
}

function calculateRelevance(queryTokens, messageTokens, content) {
  if (
    queryTokens.length === 0 ||
    messageTokens.length === 0
  ) {
    return {
      score: 0,
      matchedTerms: [],
    };
  }

  const messageFrequency = new Map();

  for (const token of messageTokens) {
    messageFrequency.set(
      token,
      (messageFrequency.get(token) ?? 0) + 1
    );
  }

  const matchedTerms = [];
  let score = 0;

  for (const token of new Set(queryTokens)) {
    const frequency = messageFrequency.get(token) ?? 0;

    if (frequency === 0) {
      continue;
    }

    matchedTerms.push(token);

    // Përputhja e termave dhe frekuenca.
    score += 10 + Math.min(frequency - 1, 3) * 2;
  }

  if (matchedTerms.length === 0) {
    return {
      score: 0,
      matchedTerms,
    };
  }

  const coverage =
    matchedTerms.length / new Set(queryTokens).size;

  score *= coverage;

  // Bonus për përputhje të plotë të frazës.
  const normalizedQuery = normalizeText(queryTokens.join(" "));
  const normalizedContent = normalizeText(content);

  if (
    normalizedQuery.length > 0 &&
    normalizedContent.includes(normalizedQuery)
  ) {
    score += 15;
  }

  return {
    score: Number(score.toFixed(4)),
    matchedTerms,
  };
}

function calculateRecency(timestamp, now) {
  const parsed = Date.parse(timestamp);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const ageHours = Math.max(0, (now - parsed) / 3_600_000);

  // Bonus maksimal 5 pikë, që zvogëlohet me kalimin e kohës.
  return Number(
    (5 / (1 + ageHours / 24)).toFixed(4)
  );
}

function createMemoryEntry(session, message) {
  return {
    sessionId: session.sessionId,
    sessionCreatedAt: session.createdAt,
    messageId: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    metadata: cloneValue(message.metadata ?? {}),
    tokens: tokenizeText(message.content),
  };
}

function compareEntries(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const timeA = Date.parse(a.timestamp) || 0;
  const timeB = Date.parse(b.timestamp) || 0;

  if (timeB !== timeA) {
    return timeB - timeA;
  }

  return a.messageId.localeCompare(b.messageId);
}

/**
 * Krijon motorin e kërkimit të memories.
 *
 * Mund të përdorë burimet standarde të memory-engine
 * ose funksione të injektuara për testim dhe integrim.
 */
export function createMemoryRetrievalEngine(dependencies = {}) {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Array.isArray(dependencies)
  ) {
    throw new TypeError("Konfigurimi i motorit nuk është i vlefshëm.");
  }

  const getSessions =
    dependencies.getSessions ?? listMemorySessions;

  const getHistory =
    dependencies.getHistory ?? getMemoryHistory;

  if (
    typeof getSessions !== "function" ||
    typeof getHistory !== "function"
  ) {
    throw new TypeError(
      "Burimet e memories duhet të jenë funksione."
    );
  }

  let index = new Map();
  let indexedMessages = 0;
  let indexedSessions = 0;
  let lastIndexedAt = null;

  function rebuildIndex(options = {}) {
    const sessions = getSessions();

    if (!Array.isArray(sessions)) {
      throw new TypeError(
        "Burimi i sesioneve duhet të kthejë një varg."
      );
    }

    const nextIndex = new Map();
    let messageCount = 0;

    for (const session of sessions) {
      if (
        !session ||
        typeof session.sessionId !== "string" ||
        !session.sessionId.trim()
      ) {
        continue;
      }

      if (
        options.sessionId &&
        session.sessionId !== options.sessionId
      ) {
        continue;
      }

      const history = getHistory(session.sessionId);

      if (!Array.isArray(history)) {
        continue;
      }

      for (const message of history) {
        if (
          !message ||
          typeof message.id !== "string" ||
          typeof message.content !== "string"
        ) {
          continue;
        }

        if (
          options.role &&
          message.role !== options.role
        ) {
          continue;
        }

        const entry = createMemoryEntry(session, message);

        nextIndex.set(
          `${session.sessionId}:${message.id}`,
          entry
        );

        messageCount += 1;
      }
    }

    index = nextIndex;
    indexedMessages = messageCount;
    indexedSessions = sessions.filter((session) => (
      session &&
      typeof session.sessionId === "string" &&
      (!options.sessionId || session.sessionId === options.sessionId)
    )).length;

    lastIndexedAt = new Date().toISOString();

    return index;
  }

  /**
   * Kërkon kujtime sipas përputhjes së termave.
   *
   * Opsionet:
   * - limit
   * - minScore
   * - sessionId
   * - role
   * - includeMetadata
   * - includeContent
   */
  function searchMemories(query, options = {}) {
    const normalizedQuery = validateQuery(query);
    const settings = validateOptions(options);

    if (settings.limit === 0) {
      return [];
    }

    const queryTokens = tokenizeText(normalizedQuery);

    if (queryTokens.length === 0) {
      return [];
    }

    rebuildIndex(settings);

    const now = Date.now();
    const results = [];

    for (const entry of index.values()) {
      const relevance = calculateRelevance(
        queryTokens,
        entry.tokens,
        entry.content
      );

      if (relevance.score <= 0) {
        continue;
      }

      const recency = calculateRecency(
        entry.timestamp,
        now
      );

      const finalScore = Number(
        (relevance.score + recency).toFixed(4)
      );

      if (finalScore < settings.minScore) {
        continue;
      }

      const result = {
        sessionId: entry.sessionId,
        messageId: entry.messageId,
        role: entry.role,
        timestamp: entry.timestamp,
        score: finalScore,
        relevanceScore: relevance.score,
        recencyScore: recency,
        matchedTerms: [...relevance.matchedTerms],
      };

      if (settings.includeContent) {
        result.content = entry.content;
      }

      if (settings.includeMetadata) {
        result.metadata = cloneValue(entry.metadata);
      }

      results.push(result);
    }

    return results
      .sort(compareEntries)
      .slice(0, settings.limit)
      .map((result) => cloneValue(result));
  }

  /**
   * Rendit një grup kujtimesh sipas relevancës.
   * Nuk ndryshon vargun origjinal.
   */
  function rankMemories(memories, query, options = {}) {
    const normalizedQuery = validateQuery(query);
    const settings = validateOptions(options);

    if (!Array.isArray(memories)) {
      throw new TypeError("memories duhet të jetë një varg.");
    }

    const queryTokens = tokenizeText(normalizedQuery);
    const now = Date.now();

    return memories
      .filter((memory) => (
        memory &&
        typeof memory === "object" &&
        typeof memory.content === "string"
      ))
      .map((memory) => {
        const relevance = calculateRelevance(
          queryTokens,
          tokenizeText(memory.content),
          memory.content
        );

        const recency = calculateRecency(
          memory.timestamp,
          now
        );

        return {
          ...cloneValue(memory),
          score: Number(
            (relevance.score + recency).toFixed(4)
          ),
          relevanceScore: relevance.score,
          recencyScore: recency,
          matchedTerms: [...relevance.matchedTerms],
        };
      })
      .filter((memory) => (
        memory.score >= settings.minScore &&
        memory.relevanceScore > 0
      ))
      .sort(compareEntries)
      .slice(0, settings.limit);
  }

  /**
   * Përzgjedh kontekstin më të përshtatshëm
   * për përpunimin e kërkesës nga AI.
   */
  function retrieveContext(query, options = {}) {
    const settings = validateOptions(options);

    const results = searchMemories(query, {
      ...options,
      limit: settings.limit,
      includeContent: true,
      includeMetadata: settings.includeMetadata,
    });

    return {
      query: validateQuery(query),
      engineVersion: MEMORY_RETRIEVAL_ENGINE_VERSION,
      retrievedAt: new Date().toISOString(),
      count: results.length,
      memories: results,
      context: results
        .map((memory) => ({
          role: memory.role,
          content: memory.content,
          timestamp: memory.timestamp,
          sessionId: memory.sessionId,
        })),
    };
  }

  /**
   * Pastron indeksin lokal.
   */
  function clearIndex() {
    const removedMessages = index.size;

    index.clear();
    indexedMessages = 0;
    indexedSessions = 0;
    lastIndexedAt = null;

    return {
      cleared: true,
      removedMessages,
    };
  }

  /**
   * Kthen statistikat e indeksit.
   */
  function getIndexStats() {
    return {
      indexedSessions,
      indexedMessages,
      version: MEMORY_RETRIEVAL_ENGINE_VERSION,
      lastIndexedAt,
    };
  }

  return Object.freeze({
    searchMemories,
    rankMemories,
    retrieveContext,
    clearIndex,
    getIndexStats,
  });
}
