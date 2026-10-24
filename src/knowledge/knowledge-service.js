
/**
 * XSUS AI — Knowledge Service
 * Version: 1.1.2
 *
 * Përgjegjësitë:
 * - Kërkimi në bazat e integruara të njohurive.
 * - Regjistrimi dhe izolimi i burimeve shtesë.
 * - Normalizimi dhe validimi i rezultateve.
 * - Deduplikimi sipas burimit dhe përmbajtjes.
 * - Renditja sipas relevancës dhe cilësisë.
 * - Filtrimi sipas gjuhës dhe fushës.
 * - Metadata të qëndrueshme për XSUS AI Core.
 */

import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

import {
  validateKnowledgeEntry
} from "./knowledge-entry.js";

import {
  hasKnowledgeDomain
} from "./knowledge-domain-registry.js";

import {
  searchAlbanianKnowledge
} from "./sq-knowledge.js";

import {
  searchEnglishKnowledge
} from "./en-knowledge.js";

import {
  searchFrenchKnowledge
} from "./fr-knowledge.js";

import {
  searchJavaScriptKnowledge
} from "./javascript-master-knowledge.js";

const knowledgeSources = new Map();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 8000;
const MAX_SOURCE_NAME_LENGTH = 100;
const MAX_PROVIDER_ERROR_LENGTH = 1000;

const ENGINE_NAME = "xsus-knowledge-service";
const ENGINE_VERSION = "1.1.2";
const SCHEMA_VERSION = "1.0.0";

const BUILT_IN_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr"
]);

const STATUS_RANK = Object.freeze({
  verified: 3,
  reviewed: 2,
  draft: 1
});

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function getBaseLanguage(language) {
  if (
    typeof language !== "string" ||
    !language.trim()
  ) {
    return "auto";
  }

  const normalized = language
    .trim()
    .toLowerCase()
    .replace(/_/gu, "-");

  if (normalized === "auto") {
    return "auto";
  }

  return normalized.split("-")[0] || "auto";
}

function normalizeLimit(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(
    1,
    Math.min(Math.floor(parsed), MAX_LIMIT)
  );
}

function normalizeMetadata(metadata) {
  return isPlainObject(metadata)
    ? { ...metadata }
    : {};
}

function normalizeResult(item, fallbackSource) {
  if (
    typeof item === "string" &&
    item.trim()
  ) {
    return {
      content: item.normalize("NFC").trim(),
      title: "",
      source: fallbackSource
    };
  }

  if (
    !isPlainObject(item) ||
    typeof item.content !== "string" ||
    !item.content.trim()
  ) {
    return null;
  }

  const result = {
    ...item,
    title:
      typeof item.title === "string"
        ? item.title.normalize("NFC").trim()
        : "",
    content: item.content.normalize("NFC").trim(),
    source:
      typeof item.source === "string" &&
      item.source.trim()
        ? item.source.normalize("NFC").trim()
        : fallbackSource
  };

  if (typeof result.id === "string") {
    result.id = result.id.trim();
  }

  if (typeof result.language === "string") {
    result.language = result.language
      .trim()
      .toLowerCase()
      .replace(/_/gu, "-");
  }

  if (typeof result.domain === "string") {
    result.domain = result.domain
      .trim()
      .toLowerCase();
  }

  if (typeof result.status === "string") {
    result.status = result.status
      .trim()
      .toLowerCase();
  }

  return result;
}

function isValidKnowledgeResult(item) {
  if (
    !isPlainObject(item) ||
    typeof item.content !== "string" ||
    !item.content.trim()
  ) {
    return false;
  }

  const hasStandardIdentity =
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.title === "string" &&
    item.title.trim().length > 0;

  // Ruaj pajtueshmërinë me burimet e vjetra.
  if (!hasStandardIdentity) {
    return true;
  }

  return validateKnowledgeEntry(item).valid;
}

function matchesKnowledgeDomain(item, requestedDomain) {
  if (!requestedDomain) {
    return true;
  }

  return (
    typeof item.domain === "string" &&
    item.domain.trim().toLowerCase() === requestedDomain
  );
}

function matchesKnowledgeLanguage(item, requestedLanguage) {
  const targetLanguage = getBaseLanguage(requestedLanguage);

  if (
    !targetLanguage ||
    targetLanguage === "auto" ||
    typeof item.language !== "string" ||
    !item.language.trim()
  ) {
    return true;
  }

  return getBaseLanguage(item.language) === targetLanguage;
}

function getResultKey(item) {
  const source =
    typeof item.source === "string"
      ? item.source.trim().toLowerCase()
      : "";

  const content = normalizeForSearch(
    typeof item.content === "string"
      ? item.content
      : ""
  );

  if (content) {
    return `source:${source}:content:${content}`;
  }

  const title = normalizeForSearch(
    typeof item.title === "string"
      ? item.title
      : ""
  );

  if (title) {
    return `source:${source}:title:${title}`;
  }

  const id =
    typeof item.id === "string"
      ? item.id.trim().toLowerCase()
      : "";

  return id ? `source:${source}:id:${id}` : "";
}

function getTokens(value) {
  return normalizeForSearch(value || "")
    .split(/\s+/u)
    .filter(Boolean);
}

function scoreResult(item, query) {
  const title = normalizeForSearch(item.title || "");
  const content = normalizeForSearch(item.content || "");
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = [
    ...new Set(getTokens(normalizedQuery))
  ];

  if (queryTokens.length === 0) {
    return 0;
  }

  const titleTokens = new Set(getTokens(title));
  const contentTokens = new Set(getTokens(content));

  let score = 0;
  let matchedTitleTokens = 0;
  let matchedContentTokens = 0;

  if (title === normalizedQuery) {
    score += 20;
  } else if (title.includes(normalizedQuery)) {
    score += 12;
  }

  if (content === normalizedQuery) {
    score += 15;
  } else if (content.includes(normalizedQuery)) {
    score += 8;
  }

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      matchedTitleTokens += 1;
    }

    if (contentTokens.has(token)) {
      matchedContentTokens += 1;
    }
  }

  score += matchedTitleTokens * 4;
  score += matchedContentTokens;

  score += Math.round(
    (matchedTitleTokens / queryTokens.length) * 4
  );

  score += Math.round(
    (matchedContentTokens / queryTokens.length) * 2
  );

  if (
    queryTokens.length > 1 &&
    matchedTitleTokens === queryTokens.length
  ) {
    score += 8;
  }

  if (
    queryTokens.length > 1 &&
    matchedContentTokens === queryTokens.length
  ) {
    score += 4;
  }

  if (item.status === "verified") {
    score += 2;
  } else if (item.status === "reviewed") {
    score += 1;
  }

  return score;
}

function compareDuplicateQuality(a, b, query) {
  const scoreDifference =
    scoreResult(b, query) - scoreResult(a, query);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const aStatus = STATUS_RANK[a.status] || 0;
  const bStatus = STATUS_RANK[b.status] || 0;

  if (aStatus !== bStatus) {
    return bStatus - aStatus;
  }

  const aTitleLength =
    typeof a.title === "string" ? a.title.length : 0;

  const bTitleLength =
    typeof b.title === "string" ? b.title.length : 0;

  if (aTitleLength !== bTitleLength) {
    return bTitleLength - aTitleLength;
  }

  return 0;
}

function deduplicateResults(results, query = "") {
  const uniqueResults = [];
  const positions = new Map();

  for (const item of results) {
    const key = getResultKey(item);

    if (!key) {
      continue;
    }

    if (!positions.has(key)) {
      positions.set(key, uniqueResults.length);
      uniqueResults.push(item);
      continue;
    }

    const existingIndex = positions.get(key);
    const existingItem = uniqueResults[existingIndex];

    if (
      compareDuplicateQuality(item, existingItem, query) < 0
    ) {
      uniqueResults[existingIndex] = item;
    }
  }

  return uniqueResults;
}

function safelySearchBuiltIn(
  searchFunction,
  query,
  limit,
  source
) {
  try {
    const results = searchFunction(query, { limit });

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map(item => normalizeResult(item, source))
      .filter(isValidKnowledgeResult);
  } catch {
    return [];
  }
}

function getBuiltInResults(query, language, limit) {
  const baseLanguage = getBaseLanguage(language);
  const results = [];

  if (baseLanguage === "auto" || baseLanguage === "sq") {
    results.push(
      ...safelySearchBuiltIn(
        searchAlbanianKnowledge,
        query,
        limit,
        "built-in-sq-knowledge"
      )
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "en") {
    results.push(
      ...safelySearchBuiltIn(
        searchEnglishKnowledge,
        query,
        limit,
        "built-in-en-knowledge"
      )
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "fr") {
    results.push(
      ...safelySearchBuiltIn(
        searchFrenchKnowledge,
        query,
        limit,
        "built-in-fr-knowledge"
      )
    );
  }

  results.push(
    ...safelySearchBuiltIn(
      searchJavaScriptKnowledge,
      query,
      limit,
      "built-in-javascript-knowledge"
    )
  );

  return results;
}

function createFailureResult(query, language, error) {
  return {
    success: false,
    query,
    language,
    results: [],
    sources: [],
    errors: [],
    error,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      resultCount: 0,
      totalUniqueResults: 0,
      rankingEnabled: true,
      deduplicationEnabled: true
    }
  };
}

function normalizeProviderError(error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.trim().slice(0, MAX_PROVIDER_ERROR_LENGTH) ||
    "Burimi shtesë nuk mundi të përpunojë kërkesën."
  );
}

function normalizeProviderFailure(response) {
  const message =
    typeof response?.error === "string"
      ? response.error
      : "";

  return (
    message.trim().slice(0, MAX_PROVIDER_ERROR_LENGTH) ||
    "Burimi shtesë raportoi një dështim."
  );
}

export function registerKnowledgeSource(name, provider) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > MAX_SOURCE_NAME_LENGTH
  ) {
    throw new TypeError(
      `Emri i burimit duhet të jetë tekst me maksimum ${MAX_SOURCE_NAME_LENGTH} karaktere.`
    );
  }

  if (typeof provider !== "function") {
    throw new TypeError("Burimi duhet të jetë funksion.");
  }

  const key = name.trim();

  if (knowledgeSources.has(key)) {
    throw new Error(
      `Burimi "${key}" është regjistruar tashmë.`
    );
  }

  knowledgeSources.set(key, provider);

  return () => {
    // Mos fshi një provider tjetër që mund të jetë
    // regjistruar me të njëjtin emër pas çregjistrimit.
    if (knowledgeSources.get(key) === provider) {
      knowledgeSources.delete(key);
    }
  };
}

export function listKnowledgeSources() {
  return [...knowledgeSources.keys()];
}

export function hasKnowledgeSource(name) {
  return (
    typeof name === "string" &&
    knowledgeSources.has(name.trim())
  );
}

export function unregisterKnowledgeSource(name) {
  return (
    typeof name === "string" &&
    knowledgeSources.delete(name.trim())
  );
}

export async function searchKnowledge(query, options = {}) {
  const safeOptions = isPlainObject(options)
    ? options
    : {};

  const language = normalizeLanguageCode(
    typeof safeOptions.language === "string" &&
    safeOptions.language.trim()
      ? safeOptions.language
      : "auto"
  );

  const originalQuery =
    typeof query === "string"
      ? query.trim()
      : "";

  if (originalQuery.length > MAX_QUERY_LENGTH) {
    return createFailureResult(
      "",
      language,
      `Pyetja nuk mund të kalojë ${MAX_QUERY_LENGTH} karaktere.`
    );
  }

  const normalizedQuery = normalizeForSearch(originalQuery);

  if (!normalizedQuery) {
    return createFailureResult(
      "",
      language,
      "Shkruaj një pyetje për të kërkuar njohuri."
    );
  }

  const limit = normalizeLimit(safeOptions.limit);

  const requestedDomain =
    typeof safeOptions.domain === "string"
      ? safeOptions.domain.trim().toLowerCase()
      : "";

  if (
    requestedDomain &&
    !hasKnowledgeDomain(requestedDomain)
  ) {
    return createFailureResult(
      normalizedQuery,
      language,
      `Fusha "${requestedDomain}" nuk njihet nga XSUS AI.`
    );
  }

  const results = getBuiltInResults(
    normalizedQuery,
    language,
    limit
  );

  const errors = [];

  const providerMetadata = normalizeMetadata(
    safeOptions.metadata
  );

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
        limit,
        domain: requestedDomain || undefined,
        metadata: { ...providerMetadata }
      });

      if (response?.success === false) {
        errors.push({
          source: sourceName,
          error: normalizeProviderFailure(response)
        });
      }

      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
          ? response.results
          : [];

      for (const item of items) {
        if (!isPlainObject(item)) {
          continue;
        }

        // Emri i regjistruar është autoritativ.
        // Provider-i nuk mund ta zëvendësojë.
        const normalizedItem = normalizeResult(
          {
            ...item,
            source: sourceName
          },
          sourceName
        );

        if (
          normalizedItem &&
          isValidKnowledgeResult(normalizedItem)
        ) {
          results.push(normalizedItem);
        }
      }
    } catch (error) {
      errors.push({
        source: sourceName,
        error: normalizeProviderError(error)
      });
    }
  }

  const filteredResults = results
    .filter(item =>
      matchesKnowledgeLanguage(item, language)
    )
    .filter(item =>
      matchesKnowledgeDomain(item, requestedDomain)
    );

  const uniqueResults = deduplicateResults(
    filteredResults,
    normalizedQuery
  );

  const rankedResults = uniqueResults
    .map((item, index) => ({
      item,
      index,
      score: scoreResult(item, normalizedQuery)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.index - b.index;
    })
    .map(entry => entry.item);

  const finalResults = rankedResults.slice(0, limit);

  return {
    success: true,
    query: normalizedQuery,
    language,
    results: finalResults,
    sources: [
      ...new Set(
        finalResults
          .map(item => item.source)
          .filter(Boolean)
      )
    ],
    errors,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      requestedDomain: requestedDomain || null,
      builtInLanguages: [...BUILT_IN_LANGUAGES],
      registeredSources: knowledgeSources.size,
      totalUniqueResults: uniqueResults.length,
      domainResultCount: uniqueResults.length,
      resultCount: finalResults.length,
      rankingEnabled: true,
      deduplicationEnabled: true,
      standardValidationAvailable:
        typeof validateKnowledgeEntry === "function"
    }
  };
}

export default searchKnowledge;
