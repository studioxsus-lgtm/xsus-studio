/**
 * XSUS AI Core — Language Knowledge Schema
 * Version: 1.0.0
 *
 * Purpose:
 * - Standardizes multilingual knowledge entries.
 * - Validates lexical and semantic data.
 * - Supports Albanian and other supported languages.
 * - Provides a stable foundation for the Language Knowledge Engine.
 *
 * Compatibility:
 * - ES Modules
 * - No external dependencies
 */

export const LANGUAGE_KNOWLEDGE_SCHEMA_VERSION = "1.0.0";

export const SUPPORTED_KNOWLEDGE_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr",
  "de",
  "it",
  "es",
  "pt",
  "nl"
]);

export const KNOWLEDGE_ENTRY_TYPES = Object.freeze([
  "word",
  "phrase",
  "idiom",
  "term",
  "expression"
]);

export const KNOWLEDGE_PARTS_OF_SPEECH = Object.freeze([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "determiner",
  "preposition",
  "conjunction",
  "interjection",
  "numeral",
  "particle",
  "other",
  "unknown"
]);

export const KNOWLEDGE_CONFIDENCE_LEVELS = Object.freeze([
  "unverified",
  "low",
  "medium",
  "high",
  "verified"
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(isNonEmptyString)
        .map((item) => item.trim())
    )
  ];
}

function normalizeLanguageCode(value) {
  if (typeof value !== "string") {
    return null;
  }

  const code = value.trim().toLowerCase();

  return SUPPORTED_KNOWLEDGE_LANGUAGES.includes(code)
    ? code
    : null;
}

/**
 * Creates a normalized multilingual knowledge entry.
 *
 * Required:
 * - id
 * - language
 * - lemma
 * - type
 *
 * Optional:
 * - definitions
 * - translations
 * - synonyms
 * - antonyms
 * - forms
 * - partOfSpeech
 * - examples
 * - tags
 * - confidence
 * - metadata
 */
export function createLanguageKnowledgeEntry(input = {}) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      entry: null,
      errors: ["Input must be an object."],
      warnings
    };
  }

  const id = isNonEmptyString(input.id)
    ? input.id.trim()
    : "";

  const language = normalizeLanguageCode(input.language);

  const lemma = isNonEmptyString(input.lemma)
    ? input.lemma.trim()
    : "";

  const type = KNOWLEDGE_ENTRY_TYPES.includes(input.type)
    ? input.type
    : null;

  if (!id) {
    errors.push("Entry id is required.");
  }

  if (!language) {
    errors.push("A supported language code is required.");
  }

  if (!lemma) {
    errors.push("Entry lemma is required.");
  }

  if (!type) {
    errors.push("A supported entry type is required.");
  }

  const partOfSpeech = input.partOfSpeech == null
    ? null
    : KNOWLEDGE_PARTS_OF_SPEECH.includes(input.partOfSpeech)
      ? input.partOfSpeech
      : null;

  if (
    input.partOfSpeech != null &&
    partOfSpeech === null
  ) {
    errors.push("Unsupported part of speech.");
  }

  const confidence = input.confidence == null
    ? "unverified"
    : KNOWLEDGE_CONFIDENCE_LEVELS.includes(input.confidence)
      ? input.confidence
      : null;

  if (confidence === null) {
    errors.push("Unsupported confidence level.");
  }

  const definitions = normalizeStringArray(input.definitions);
  const synonyms = normalizeStringArray(input.synonyms);
  const antonyms = normalizeStringArray(input.antonyms);
  const forms = normalizeStringArray(input.forms);
  const examples = normalizeStringArray(input.examples);
  const tags = normalizeStringArray(input.tags);

  if (definitions.length === 0) {
    warnings.push("The entry has no definitions.");
  }

  if (examples.length === 0) {
    warnings.push("The entry has no examples.");
  }

  const translations = {};

  if (
    input.translations != null &&
    (
      typeof input.translations !== "object" ||
      Array.isArray(input.translations)
    )
  ) {
    errors.push("Translations must be an object.");
  } else if (input.translations) {
    for (const [rawLanguage, rawValues] of Object.entries(
      input.translations
    )) {
      const targetLanguage = normalizeLanguageCode(rawLanguage);

      if (!targetLanguage) {
        errors.push(
          `Unsupported translation language: ${rawLanguage}.`
        );
        continue;
      }

      if (targetLanguage === language) {
        warnings.push(
          `Translation target ${targetLanguage} matches the source language.`
        );
      }

      const values = normalizeStringArray(
        Array.isArray(rawValues) ? rawValues : [rawValues]
      );

      if (values.length > 0) {
        translations[targetLanguage] = values;
      }
    }
  }

  const metadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? { ...input.metadata }
      : {};

  if (
    input.metadata != null &&
    (
      typeof input.metadata !== "object" ||
      Array.isArray(input.metadata)
    )
  ) {
    errors.push("Metadata must be an object.");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      entry: null,
      errors,
      warnings
    };
  }

  const entry = {
    schemaVersion: LANGUAGE_KNOWLEDGE_SCHEMA_VERSION,
    id,
    language,
    lemma,
    type,
    partOfSpeech,
    definitions,
    translations,
    synonyms,
    antonyms,
    forms,
    examples,
    tags,
    confidence,
    metadata
  };

  return {
    valid: true,
    entry,
    errors: [],
    warnings
  };
}

/**
 * Validates an existing entry against the current schema.
 */
export function validateLanguageKnowledgeEntry(input) {
  const result = createLanguageKnowledgeEntry(input);

  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings
  };
}

/**
 * Creates a collection of validated knowledge entries.
 *
 * Duplicate IDs are rejected to keep entries addressable.
 */
export function createLanguageKnowledgeCollection(entries = []) {
  if (!Array.isArray(entries)) {
    return {
      valid: false,
      entries: [],
      errors: ["Entries must be an array."],
      warnings: []
    };
  }

  const normalizedEntries = [];
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  entries.forEach((item, index) => {
    const result = createLanguageKnowledgeEntry(item);

    warnings.push(
      ...result.warnings.map(
        (warning) => `Entry ${index}: ${warning}`
      )
    );

    if (!result.valid) {
      errors.push(
        ...result.errors.map(
          (error) => `Entry ${index}: ${error}`
        )
      );
      return;
    }

    if (seenIds.has(result.entry.id)) {
      errors.push(
        `Entry ${index}: duplicate id "${result.entry.id}".`
      );
      return;
    }

    seenIds.add(result.entry.id);
    normalizedEntries.push(result.entry);
  });

  return {
    valid: errors.length === 0,
    entries: normalizedEntries,
    errors,
    warnings
  };
}
