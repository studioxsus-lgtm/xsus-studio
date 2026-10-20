import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

import { searchAlbanianKnowledge } from "./sq-knowledge.js";
import { searchEnglishKnowledge } from "./en-knowledge.js";
import { searchFrenchKnowledge } from "./fr-knowledge.js";
import { searchJavaScriptKnowledge } from "./javascript-master-knowledge.js";

const knowledgeSources = new Map();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

function getBaseLanguage(language) {
  if (language === "auto") {
    return "auto";
  }

  return language.split("-")[0].toLowerCase();
}

function normalizeLimit(value) {
  if (value === undefined || value === null) {
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
    typeof item.content !== "string" ||
    !item.content.trim()
  ) {
    return null;
  }

  return {
    ...item,
    title: typeof item.title === "string"
      ? item.title.trim()
      : "",
    content: item.content.trim(),
    source: typeof item.source === "string" && item.source.trim()
      ? item.source.trim()
      : fallbackSource
  };
}

function getResultKey(item) {
  return normalizeForSearch(
    `${item.title || ""} ${item.content || ""}`
  );
}

function scoreResult(item, query) {
  const title = normalizeForSearch(item.title || "");
  const content = normalizeForSearch(item.content || "");
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = [
    ...new Set(normalizedQuery.split(/\s+/u).filter(Boolean))
  ];

  const titleTokens = new Set(
    title.split(/\s+/u).filter(Boolean)
  );

  const contentTokens = new Set(
    content.split(/\s+/u).filter(Boolean)
  );

  let score = 0;

  if (title === normalizedQuery) {
    score += 12;
  } else if (title.includes(normalizedQuery)) {
    score += 8;
  }

  if (content === normalizedQuery) {
    score += 10;
  } else if (content.includes(normalizedQuery)) {
    score += 5;
  }

  let matchedTitleTokens = 0;
  let matchedContentTokens = 0;

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      matchedTitleTokens += 1;
    }

    if (contentTokens.has(token)) {
      matchedContentTokens += 1;
    }
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

  return score;
}

function deduplicateResults(results) {
  const uniqueResults = [];
  const seen = new Set();

  for (const item of results) {
    const key = getResultKey(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueResults.push(item);
  }

  return uniqueResults;
}

function getBuiltInResults(query, language, limit) {
  const baseLanguage = getBaseLanguage(language);
  const results = [];

  if (baseLanguage === "auto" || baseLanguage === "sq") {
    results.push(
      ...searchAlbanianKnowledge(query, { limit })
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "en") {
    results.push(
      ...searchEnglishKnowledge(query, { limit })
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "fr") {
    results.push(
      ...searchFrenchKnowledge(query, { limit })
    );
  }

  // Njohuritë për JavaScript janë të disponueshme në çdo gjuhë.
  results.push(
    ...searchJavaScriptKnowledge(query, { limit })
  );

  return results
    .map(item => normalizeResult(item, "built-in-knowledge"))
    .filter(Boolean);
}

export async function searchKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return {
      success: false,
      query: "",
      language: normalizeLanguageCode(options.language || "auto"),
      results: [],
      sources: [],
      errors: [],
      error: "Shkruaj një pyetje për të kërkuar njohuri.",
      metadata: {
        engine: "xsus-knowledge-service",
        resultCount: 0
      }
    };
  }

  const language = normalizeLanguageCode(
    options.language || "auto"
  );

  const limit = normalizeLimit(options.limit);
  const results = getBuiltInResults(
    normalizedQuery,
    language,
    limit
  );

  const errors = [];

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
        limit,
        metadata: options.metadata &&
          typeof options.metadata === "object" &&
          !Array.isArray(options.metadata)
          ? { ...options.metadata }
          : {}
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

  const rankedResults = uniqueResults
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
      ...new Set(
        finalResults
          .map(item => item.source)
          .filter(Boolean)
      )
    ],
    errors,
    metadata: {
      engine: "xsus-knowledge-service",
      builtInLanguages: ["sq", "en", "fr"],
      registeredSources: knowledgeSources.size,
      totalUniqueResults: uniqueResults.length,
      resultCount: finalResults.length,
      rankingEnabled: true,
      deduplicationEnabled: true
    }
  };
}
