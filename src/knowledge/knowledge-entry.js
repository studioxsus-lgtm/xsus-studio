
/**
 * XSUS AI — Knowledge Entry Standard
 * Version: 1.1.2
 *
 * Standard i përbashkët për njohuritë e të gjitha fushave.
 * Ofron validim, normalizim dhe hyrje të pandryshueshme.
 */

import {
  normalizeLanguageCode as normalizeLanguageCodeBase,
  getBaseLanguage
} from "../language/normalization.js";

export const KNOWLEDGE_SCHEMA_VERSION = "1.1.2";

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

const DEFAULTS = Object.freeze({
  domain: "general",
  topic: "general",
  language: "sq",
  difficulty: "beginner",
  status: "draft",
  source: "xsus-knowledge",
  version: "1.0.0"
});

function cleanString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const result = value.trim();
  return result || fallback;
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().normalize("NFC"))
        .filter(Boolean)
    )
  ];
}

function normalizeEntryLanguage(value) {
  const input = cleanString(value, DEFAULTS.language)
    .replace(/_/gu, "-");

  const normalized = normalizeLanguageCodeBase(input);

  if (!normalized || normalized === "auto") {
    throw new TypeError(
      "Kodi i gjuhës nuk është i vlefshëm."
    );
  }

  const baseLanguage = getBaseLanguage(normalized);

  if (
    typeof baseLanguage !== "string" ||
    !/^[a-z]{2,3}$/iu.test(baseLanguage)
  ) {
    throw new TypeError(
      "Kodi i gjuhës nuk është i vlefshëm."
    );
  }

  return normalized.toLowerCase();
}

function assertAllowed(value, allowed, label) {
  if (allowed.includes(value)) {
    return;
  }

  if (label === "Fusha") {
    throw new TypeError(
      `Fusha "${value}" nuk njihet nga XSUS AI.`
    );
  }

  if (label === "Niveli") {
    throw new TypeError(
      `Niveli "${value}" nuk është i vlefshëm.`
    );
  }

  throw new TypeError(
    `Statusi "${value}" nuk është i vlefshëm.`
  );
}

/**
 * Krijon një hyrje të standardizuar të njohurive.
 */
export function createKnowledgeEntry(input = {}) {
  if (
    input === null ||
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
    DEFAULTS.domain
  ).toLowerCase();

  assertAllowed(domain, KNOWLEDGE_DOMAINS, "Fusha");

  const difficulty = cleanString(
    input.difficulty,
    DEFAULTS.difficulty
  ).toLowerCase();

  assertAllowed(
    difficulty,
    KNOWLEDGE_DIFFICULTIES,
    "Niveli"
  );

  const status = cleanString(
    input.status,
    DEFAULTS.status
  ).toLowerCase();

  assertAllowed(status, KNOWLEDGE_STATUSES, "Statusi");

  const language = normalizeEntryLanguage(input.language);

  return Object.freeze({
    id,
    title,
    content,
    domain,
    topic: cleanString(input.topic, DEFAULTS.topic),
    language,
    difficulty,
    status,
    keywords: Object.freeze(normalizeList(input.keywords)),
    tags: Object.freeze(normalizeList(input.tags)),
    source: cleanString(input.source, DEFAULTS.source),
    version: cleanString(input.version, DEFAULTS.version),
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
 * Krijon një koleksion hyrjesh të standardizuara.
 * ID-të duhet të jenë unike brenda koleksionit.
 */
export function createKnowledgeCollection(entries = []) {
  if (!Array.isArray(entries)) {
    throw new TypeError(
      "Koleksioni i njohurive duhet të jetë një varg."
    );
  }

  const ids = new Set();
  const collection = [];

  for (const entry of entries) {
    const normalized = createKnowledgeEntry(entry);

    if (ids.has(normalized.id)) {
      throw new Error(
        `ID e përsëritur në koleksion: "${normalized.id}".`
      );
    }

    ids.add(normalized.id);
    collection.push(normalized);
  }

  return Object.freeze(collection);
}
