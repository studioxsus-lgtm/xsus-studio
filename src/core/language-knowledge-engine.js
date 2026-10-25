/**
 * XSUS AI Core — Language Knowledge Engine
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Manage multilingual lexical knowledge.
 * - Validate and register knowledge entries.
 * - Search by ID, lemma, definition, synonym and translation.
 * - Retrieve translations between supported languages.
 * - Prevent duplicate IDs.
 * - Keep the engine independent from external services.
 *
 * Dependencies:
 * - language-knowledge-schema.js
 */

import {
  LANGUAGE_KNOWLEDGE_SCHEMA_VERSION,
  SUPPORTED_KNOWLEDGE_LANGUAGES,
  createLanguageKnowledgeEntry
} from "./language-knowledge-schema.js";

export const LANGUAGE_KNOWLEDGE_ENGINE_VERSION = "1.0.0";

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cloneEntry(entry) {
  return {
    ...entry,
    definitions: [...entry.definitions],
    translations: Object.fromEntries(
      Object.entries(entry.translations).map(([language, values]) => [
        language,
        [...values]
      ])
    ),
    synonyms: [...entry.synonyms],
    antonyms: [...entry.antonyms],
    forms: [...entry.forms],
    examples: [...entry.examples],
    tags: [...entry.tags],
    metadata: { ...entry.metadata }
  };
}

function matchesText(value, query) {
  return normalizeText(value).includes(normalizeText(query));
}

function entryContainsQuery(entry, query) {
  if (!query) {
    return false;
  }

  const searchableValues = [
    entry.lemma,
    ...entry.definitions,
    ...entry.synonyms,
    ...entry.antonyms,
    ...entry.forms,
    ...entry.examples,
    ...entry.tags,
    ...Object.values(entry.translations).flat()
  ];

  return searchableValues.some((value) => matchesText(value, query));
}

function normalizeLanguageFilter(language) {
  if (language == null || language === "") {
    return null;
  }

  if (typeof language !== "string") {
    return null;
  }

  const normalized = language.trim().toLowerCase();

  return SUPPORTED_KNOWLEDGE_LANGUAGES.includes(normalized)
    ? normalized
    : null;
}

function normalizeLimit(limit, fallback = 20) {
  if (!Number.isInteger(limit) || limit < 1) {
    return fallback;
  }

  return Math.min(limit, 100);
}

/**
 * Creates an isolated in-memory language knowledge engine.
 *
 * The engine does not persist entries between process restarts.
 * Persistence can be added later through a dedicated storage adapter.
 */
export function createLanguageKnowledgeEngine(options = {}) {
  const entries = new Map();
  const lemmaIndex = new Map();

  function addToLemmaIndex(entry) {
    const key = `${entry.language}:${normalizeText(entry.lemma)}`;

    if (!lemmaIndex.has(key)) {
      lemmaIndex.set(key, new Set());
    }

    lemmaIndex.get(key).add(entry.id);
  }

  function removeFromLemmaIndex(entry) {
    const key = `${entry.language}:${normalizeText(entry.lemma)}`;
    const ids = lemmaIndex.get(key);

    if (!ids) {
      return;
    }

    ids.delete(entry.id);

    if (ids.size === 0) {
      lemmaIndex.delete(key);
    }
  }

  function getStoredEntry(id) {
    if (!isNonEmptyString(id)) {
      return null;
    }

    const entry = entries.get(id.trim());

    return entry ? cloneEntry(entry) : null;
  }

  function register(input) {
    const result = createLanguageKnowledgeEntry(input);

    if (!result.valid) {
      return {
        success: false,
        entry: null,
        errors: result.errors,
        warnings: result.warnings
      };
    }

    const entry = result.entry;

    if (entries.has(entry.id)) {
      return {
        success: false,
        entry: null,
        errors: [`Entry id "${entry.id}" already exists.`],
        warnings: result.warnings
      };
    }

    entries.set(entry.id, cloneEntry(entry));
    addToLemmaIndex(entry);

    return {
      success: true,
      entry: cloneEntry(entry),
      errors: [],
      warnings: result.warnings
    };
  }

  function registerMany(inputEntries) {
    if (!Array.isArray(inputEntries)) {
      return {
        success: false,
        registered: [],
        errors: ["Entries must be an array."]
      };
    }

    const registered = [];
    const errors = [];

    for (const input of inputEntries) {
      const result = register(input);

      if (result.success) {
        registered.push(result.entry);
      } else {
        errors.push(...result.errors);
      }
    }

    return {
      success: errors.length === 0,
      registered,
      errors
    };
  }

  function getById(id) {
    return getStoredEntry(id);
  }

  function search(options = {}) {
    const query = typeof options.query === "string"
      ? options.query.trim()
      : "";

    if (!query) {
      return {
        success: false,
        results: [],
        total: 0,
        errors: ["Search query must not be empty."]
      };
    }

    const language = normalizeLanguageFilter(options.language);

    if (options.language && !language) {
      return {
        success: false,
        results: [],
        total: 0,
        errors: ["Unsupported language filter."]
      };
    }

    const limit = normalizeLimit(options.limit);
    const exact = options.exact === true;
    const normalizedQuery = normalizeText(query);
    const results = [];

    for (const entry of entries.values()) {
      if (language && entry.language !== language) {
        continue;
      }

      const exactMatch = [
        entry.lemma,
        ...entry.forms,
        ...entry.synonyms,
        ...Object.values(entry.translations).flat()
      ].some((value) => normalizeText(value) === normalizedQuery);

      const partialMatch = entryContainsQuery(entry, query);

      if ((exact && exactMatch) || (!exact && partialMatch)) {
        results.push(cloneEntry(entry));
      }
    }

    results.sort((a, b) => {
      const aExact = normalizeText(a.lemma) === normalizedQuery;
      const bExact = normalizeText(b.lemma) === normalizedQuery;

      if (aExact !== bExact) {
        return aExact ? -1 : 1;
      }

      return a.lemma.localeCompare(b.lemma, a.language);
    });

    return {
      success: true,
      results: results.slice(0, limit),
      total: results.length,
      errors: []
    };
  }

  function getTranslations(input = {}) {
    const sourceLanguage = normalizeLanguageFilter(input.sourceLanguage);
    const targetLanguage = normalizeLanguageFilter(input.targetLanguage);

    if (!sourceLanguage || !targetLanguage) {
      return {
        success: false,
        translations: [],
        errors: ["Valid source and target languages are required."]
      };
    }

    if (!isNonEmptyString(input.query)) {
      return {
        success: false,
        translations: [],
        errors: ["Translation query must not be empty."]
      };
    }

    const query = input.query.trim();
    const sourceResults = search({
      query,
      language: sourceLanguage,
      exact: input.exact === true,
      limit: 100
    });

    if (!sourceResults.success) {
      return {
        success: false,
        translations: [],
        errors: sourceResults.errors
      };
    }

    const translations = [];

    for (const entry of sourceResults.results) {
      const values = entry.translations[targetLanguage] || [];

      for (const text of values) {
        translations.push({
          sourceId: entry.id,
          sourceLanguage,
          sourceLemma: entry.lemma,
          targetLanguage,
          text
        });
      }
    }

    return {
      success: true,
      translations,
      errors: []
    };
  }

  function remove(id) {
    if (!isNonEmptyString(id)) {
      return {
        success: false,
        removed: false,
        errors: ["A valid entry id is required."]
      };
    }

    const normalizedId = id.trim();
    const entry = entries.get(normalizedId);

    if (!entry) {
      return {
        success: false,
        removed: false,
        errors: [`Entry id "${normalizedId}" was not found.`]
      };
    }

    removeFromLemmaIndex(entry);
    entries.delete(normalizedId);

    return {
      success: true,
      removed: true,
      errors: []
    };
  }

  function getStats() {
    const languageCounts = {};

    for (const language of SUPPORTED_KNOWLEDGE_LANGUAGES) {
      languageCounts[language] = 0;
    }

    for (const entry of entries.values()) {
      languageCounts[entry.language] += 1;
    }

    return {
      engineVersion: LANGUAGE_KNOWLEDGE_ENGINE_VERSION,
      schemaVersion: LANGUAGE_KNOWLEDGE_SCHEMA_VERSION,
      totalEntries: entries.size,
      indexedLemmas: lemmaIndex.size,
      languageCounts
    };
  }

  function clear() {
    const removedCount = entries.size;

    entries.clear();
    lemmaIndex.clear();

    return {
      success: true,
      removedCount
    };
  }

  return Object.freeze({
    version: LANGUAGE_KNOWLEDGE_ENGINE_VERSION,
    register,
    registerMany,
    getById,
    search,
    getTranslations,
    remove,
    getStats,
    clear
  });
}

export function createDefaultLanguageKnowledgeEngine() {
  return createLanguageKnowledgeEngine();
}
