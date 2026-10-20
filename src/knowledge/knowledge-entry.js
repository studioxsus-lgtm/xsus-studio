
/**
 * XSUS AI — Knowledge Entry Standard
 * Version: 1.0.0
 *
 * Standard i përbashkët për njohuritë e të gjitha fushave.
 */

export const KNOWLEDGE_SCHEMA_VERSION = "1.0.0";

export const KNOWLEDGE_DOMAINS = Object.freeze([
  "general",
  "programming",
  "mathematics",
  "science",
  "technology",
  "history",
  "geography",
  "economics",
  "law",
  "health",
  "education",
  "culture",
  "language"
]);

export const KNOWLEDGE_DIFFICULTIES = Object.freeze([
  "beginner",
  "intermediate",
  "advanced",
  "expert"
]);

export const KNOWLEDGE_STATUSES = Object.freeze([
  "draft",
  "reviewed",
  "verified"
]);

function cleanString(value, fallback = "") {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(item => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean)
    )
  ];
}

/**
 * Krijon një hyrje të standardizuar të njohurive.
 */
export function createKnowledgeEntry(input = {}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Hyrja e njohurive duhet të jetë objekt."
    );
  }

  const id = cleanString(input.id);
  const title = cleanString(input.title);
  const content = cleanString(input.content);

  if (!id) {
    throw new TypeError(
      "Hyrja e njohurive duhet të ketë një ID."
    );
  }

  if (!title) {
    throw new TypeError(
      "Hyrja e njohurive duhet të ketë një titull."
    );
  }

  if (!content) {
    throw new TypeError(
      "Hyrja e njohurive duhet të ketë përmbajtje."
    );
  }

  const domain = cleanString(
    input.domain,
    "general"
  ).toLowerCase();

  if (!KNOWLEDGE_DOMAINS.includes(domain)) {
    throw new TypeError(
      `Fusha "${domain}" nuk njihet nga XSUS AI.`
    );
  }

  const difficulty = cleanString(
    input.difficulty,
    "beginner"
  ).toLowerCase();

  if (!KNOWLEDGE_DIFFICULTIES.includes(difficulty)) {
    throw new TypeError(
      `Niveli "${difficulty}" nuk është i vlefshëm.`
    );
  }

  const status = cleanString(
    input.status,
    "draft"
  ).toLowerCase();

  if (!KNOWLEDGE_STATUSES.includes(status)) {
    throw new TypeError(
      `Statusi "${status}" nuk është i vlefshëm.`
    );
  }

  const language = cleanString(
    input.language,
    "sq"
  ).toLowerCase();

  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/u.test(language)) {
    throw new TypeError(
      "Kodi i gjuhës nuk është i vlefshëm."
    );
  }

  return Object.freeze({
    id,
    title,
    content,
    domain,
    topic: cleanString(input.topic, "general"),
    language,
    difficulty,
    status,
    keywords: Object.freeze(
      normalizeList(input.keywords)
    ),
    tags: Object.freeze(
      normalizeList(input.tags)
    ),
    source: cleanString(input.source, "xsus-knowledge"),
    version: cleanString(input.version, "1.0.0"),
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION
  });
}

/**
 * Kontrollon një hyrje pa ndërprerë programin.
 */
export function validateKnowledgeEntry(input) {
  try {
    createKnowledgeEntry(input);

    return {
      valid: true,
      errors: []
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Hyrja e njohurive nuk është e vlefshme."
      ]
    };
  }
}

/**
 * Krijon një grup hyrjesh të standardizuara.
 */
export function createKnowledgeCollection(entries = []) {
  if (!Array.isArray(entries)) {
    throw new TypeError(
      "Koleksioni i njohurive duhet të jetë një varg."
    );
  }

  const ids = new Set();

  return Object.freeze(
    entries.map(entry => {
      const normalized = createKnowledgeEntry(entry);

      if (ids.has(normalized.id)) {
        throw new Error(
          `ID e përsëritur në koleksion: "${normalized.id}".`
        );
      }

      ids.add(normalized.id);

      return normalized;
    })
  );
}
