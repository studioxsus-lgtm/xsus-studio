// src/knowledge/knowledge-service.js
// XSUS AI — Knowledge Service
// Version: 1.1.1

import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

import { validateKnowledgeEntry } from "./knowledge-entry.js";
import { hasKnowledgeDomain } from "./knowledge-domain-registry.js";

import { searchAlbanianKnowledge } from "./sq-knowledge.js";
import { searchEnglishKnowledge } from "./en-knowledge.js";
import { searchFrenchKnowledge } from "./fr-knowledge.js";
import { searchJavaScriptKnowledge } from "./javascript-master-knowledge.js";

const knowledgeSources = new Map();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ENGINE_NAME = "xsus-knowledge-service";
const ENGINE_VERSION = "1.1.1";

function getBaseLanguage(language) {
  if (language === "auto") return "auto";
  return language.split("-")[0].toLowerCase();
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;

  return Math.max(1, Math.min(Math.floor(parsed), MAX_LIMIT));
}

function normalizeMetadata(metadata) {
  return metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
    ? { ...metadata }
    : {};
}

function normalizeResult(item, fallbackSource) {
  if (typeof item === "string" && item.trim()) {
    return {
      content: item.trim(),
      source: fallbackSource
    };
  }

  if (
    !item ||
    typeof item !== "object" ||
    Array.isArray(item) ||
    typeof item.content !== "string" ||
    !item.content.trim()
  ) {
    return null;
  }

  const result = {
    ...item,
    title: typeof item.title === "string"
      ? item.title.trim()
      : "",
    content: item.content.trim(),
    source: typeof item.source === "string" && item.source.trim()
      ? item.source.trim()
      : fallbackSource
  };

  if (typeof result.id === "string") {
    result.id = result.id.trim();
  }

  if (typeof result.language === "string") {
    result.language = result.language.trim().toLowerCase();
  }

  if (typeof result.domain === "string") {
    result.domain = result.domain.trim().toLowerCase();
  }

  return result;
}

function matchesKnowledgeDomain(item, requestedDomain) {
  if (!requestedDomain) return true;

  return typeof item.domain === "string" &&
    item.domain.trim().toLowerCase() === requestedDomain;
}

/**
 * Krijon një çelës unik për deduplikimin.
 *
 * Prioriteti:
 * 1. Titulli dhe përmbajtja e normalizuar.
 * 2. Burimi dhe ID-ja, kur mungojnë të dyja fushat tekstuale.
 *
 * ID-të e ndryshme nuk duhet të pengojnë heqjen
 * e dublikatave me të njëjtin titull dhe përmbajtje.
 */
function getResultKey(item) {
  const title = normalizeForSearch(item.title || "");
  const content = normalizeForSearch(item.content || "");

  if (title || content) {
    return `content:${title}|${content}`;
  }

  const id = typeof item.id === "string"
    ? item.id.trim().toLowerCase()
    : "";

  const source = typeof item.source === "string"
    ? item.source.trim().toLowerCase()
    : "";

  if (id) {
    return `id:${source}:${id}`;
  }

  return "";
}

function scoreResult(item, query) {
  const title = normalizeForSearch(item.title || "");
  const content = normalizeForSearch(item.content || "");
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return 0;

  const queryTokens = [
    ...new Set(normalizedQuery.split(/\s+/u).filter(Boolean))
  ];

  const titleTokens = new Set(title.split(/\s+/u).filter(Boolean));
  const contentTokens = new Set(content.split(/\s+/u).filter(Boolean));

  let score = 0;
  let matchedTitleTokens = 0;
  let matchedContentTokens = 0;

  if (title === normalizedQuery) score += 12;
  else if (title.includes(normalizedQuery)) score += 8;

  if (content === normalizedQuery) score += 10;
  else if (content.includes(normalizedQuery)) score += 5;

  for (const token of queryTokens) {
    if (titleTokens.has(token)) matchedTitleTokens += 1;
    if (contentTokens.has(token)) matchedContentTokens += 1;
  }

  score += matchedTitleTokens * 3;
  score += matchedContentTokens;

  if (
    queryTokens.length > 1 &&
    matchedTitleTokens === queryTokens.length
  ) {
    score += 5;
  }

  if (
    queryTokens.length > 1 &&
    matchedContentTokens === queryTokens.length
  ) {
    score += 3;
  }

  if (item.status === "verified") score += 2;
  else if (item.status === "reviewed") score += 1;

  return score;
}

function deduplicateResults(results) {
  const uniqueResults = [];
  const seen = new Set();

  for (const item of results) {
    const key = getResultKey(item);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    uniqueResults.push(item);
  }

  return uniqueResults;
}

function getBuiltInResults(query, language, limit) {
  const baseLanguage = getBaseLanguage(language);
  const results = [];

  if (baseLanguage === "auto" || baseLanguage === "sq") {
    results.push(...searchAlbanianKnowledge(query, { limit }));
  }

  if (baseLanguage === "auto" || baseLanguage === "en") {
    results.push(...searchEnglishKnowledge(query, { limit }));
  }

  if (baseLanguage === "auto" || baseLanguage === "fr") {
    results.push(...searchFrenchKnowledge(query, { limit }));
  }

  // Njohuritë për JavaScript kërkohen në çdo gjuhë.
  results.push(...searchJavaScriptKnowledge(query, { limit }));

  return results
    .map(item => normalizeResult(item, "built-in-knowledge"))
    .filter(Boolean);
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
      resultCount: 0
    }
  };
}

export function registerKnowledgeSource(name, provider) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Emri i burimit duhet të jetë tekst.");
  }

  if (typeof provider !== "function") {
    throw new TypeError("Burimi duhet të jetë funksion.");
  }

  const key = name.trim();

  if (knowledgeSources.has(key)) {
    throw new Error(`Burimi "${key}" është regjistruar tashmë.`);
  }

  knowledgeSources.set(key, provider);

  return () => {
    if (knowledgeSources.get(key) === provider) {
      knowledgeSources.delete(key);
    }
  };
}

export function listKnowledgeSources() {
  return [...knowledgeSources.keys()];
}

export function hasKnowledgeSource(name) {
  return typeof name === "string" &&
    knowledgeSources.has(name.trim());
}

export function unregisterKnowledgeSource(name) {
  return typeof name === "string" &&
    knowledgeSources.delete(name.trim());
}

export async function searchKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(
    typeof query === "string" ? query : ""
  );

  const language = normalizeLanguageCode(
    typeof options.language === "string" && options.language.trim()
      ? options.language
      : "auto"
  );

  if (!normalizedQuery) {
    return createFailureResult(
      "",
      language,
      "Shkruaj një pyetje për të kërkuar njohuri."
    );
  }

  const limit = normalizeLimit(options.limit);

  const requestedDomain = typeof options.domain === "string"
    ? options.domain.trim().toLowerCase()
    : "";

  if (requestedDomain && !hasKnowledgeDomain(requestedDomain)) {
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
  const providerMetadata = normalizeMetadata(options.metadata);

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
        limit,
        domain: requestedDomain || undefined,
        metadata: { ...providerMetadata }
      });

      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
          ? response.results
          : [];

      for (const item of items) {
        const normalizedItem = normalizeResult(item, sourceName);

        if (normalizedItem) {
          results.push(normalizedItem);
        }
      }

      if (response?.success === false) {
        errors.push({
          source: sourceName,
          error: typeof response.error === "string"
            ? response.error
            : "Burimi raportoi dështim gjatë kërkimit."
        });
      }
    } catch (error) {
      errors.push({
        source: sourceName,
        error: error instanceof Error
          ? error.message
          : "Gabim gjatë kërkimit."
      });
    }
  }

  const uniqueResults = deduplicateResults(results);

  const domainResults = uniqueResults.filter(
    item => matchesKnowledgeDomain(item, requestedDomain)
  );

  const rankedResults = domainResults
    .map((item, index) => ({
      item,
      index,
      score: scoreResult(item, normalizedQuery)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);

  const finalResults = rankedResults.slice(0, limit);

  return {
    success: true,
    query: normalizedQuery,
    language,
    results: finalResults,
    sources: [
      ...new Set(finalResults.map(item => item.source).filter(Boolean))
    ],
    errors,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      schemaVersion: "1.0.0",
      requestedDomain: requestedDomain || null,
      builtInLanguages: ["sq", "en", "fr"],
      registeredSources: knowledgeSources.size,
      totalUniqueResults: uniqueResults.length,
      domainResultCount: domainResults.length,
      resultCount: finalResults.length,
      rankingEnabled: true,
      deduplicationEnabled: true,
      standardValidationAvailable:
        typeof validateKnowledgeEntry === "function"
    }
  };
}
