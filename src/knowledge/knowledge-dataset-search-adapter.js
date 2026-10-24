import {
  normalizeForSearch,
  normalizeLanguageCode,
  getBaseLanguage
} from "../language/normalization.js";

export const ENGINE_NAME =
  "xsus-knowledge-dataset-search-adapter";

export const ENGINE_VERSION = "1.0.0";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 8000;

const STATUS_RANK = Object.freeze({
  verified: 3,
  reviewed: 2,
  published: 2,
  draft: 1
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function createMetadata({
  query = "",
  language = null,
  domain = null,
  resultCount = 0,
  matchedCount = 0,
  limit = DEFAULT_LIMIT,
  datasetCount = 0
} = {}) {
  return {
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    query,
    language,
    domain,
    resultCount,
    matchedCount,
    limit,
    datasetCount
  };
}

function createErrorResult(message, metadata = {}) {
  return {
    success: false,
    results: [],
    error: message,
    metadata: createMetadata(metadata)
  };
}

function normalizeLanguage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const language = normalizeLanguageCode(value);

  return language === "auto" ? null : language;
}

function normalizeDomain(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return normalizeForSearch(value);
}

function matchesLanguage(entryLanguage, requestedLanguage) {
  if (!requestedLanguage) {
    return true;
  }

  const entry = normalizeLanguage(entryLanguage);

  if (!entry) {
    return false;
  }

  return (
    entry.toLowerCase() === requestedLanguage.toLowerCase() ||
    getBaseLanguage(entry) === getBaseLanguage(requestedLanguage)
  );
}

function matchesDomain(entryDomain, requestedDomain) {
  if (!requestedDomain) {
    return true;
  }

  return normalizeDomain(entryDomain) === requestedDomain;
}

function getDatasetEntries(dataset) {
  if (Array.isArray(dataset)) {
    return dataset;
  }

  if (!dataset || typeof dataset !== "object") {
    return [];
  }

  if (Array.isArray(dataset.entries)) {
    return dataset.entries;
  }

  if (Array.isArray(dataset.collection)) {
    return dataset.collection;
  }

  if (Array.isArray(dataset.collection?.entries)) {
    return dataset.collection.entries;
  }

  if (
    Array.isArray(dataset.collection?.collection?.entries)
  ) {
    return dataset.collection.collection.entries;
  }

  return [];
}

function isValidSearchEntry(entry) {
  return (
    isPlainObject(entry) &&
    typeof entry.id === "string" &&
    entry.id.trim().length > 0 &&
    typeof entry.title === "string" &&
    entry.title.trim().length > 0 &&
    typeof entry.content === "string" &&
    entry.content.trim().length > 0 &&
    typeof entry.language === "string" &&
    typeof entry.domain === "string"
  );
}

function getSearchableText(entry) {
  const values = [
    entry.title,
    entry.content,
    entry.topic,
    entry.domain,
    ...(Array.isArray(entry.keywords) ? entry.keywords : []),
    ...(Array.isArray(entry.tags) ? entry.tags : [])
  ];

  return normalizeForSearch(
    values
      .filter((value) => typeof value === "string")
      .join(" ")
  );
}

function getSearchableFields(entry) {
  return {
    title: normalizeForSearch(entry.title),
    topic: normalizeForSearch(entry.topic),
    content: normalizeForSearch(entry.content),
    keywords: normalizeForSearch(
      Array.isArray(entry.keywords)
        ? entry.keywords.join(" ")
        : ""
    ),
    tags: normalizeForSearch(
      Array.isArray(entry.tags)
        ? entry.tags.join(" ")
        : ""
    )
  };
}

function getStatusRank(status) {
  if (typeof status !== "string") {
    return 0;
  }

  return STATUS_RANK[status.toLowerCase()] || 0;
}

function scoreEntry(entry, query, queryTerms) {
  const fields = getSearchableFields(entry);
  let score = 0;

  if (fields.title === query) {
    score += 100;
  } else if (fields.title.includes(query)) {
    score += 60;
  }

  if (fields.topic === query) {
    score += 40;
  } else if (fields.topic.includes(query)) {
    score += 25;
  }

  if (fields.keywords.includes(query)) {
    score += 35;
  }

  if (fields.tags.includes(query)) {
    score += 20;
  }

  if (fields.content.includes(query)) {
    score += 15;
  }

  for (const term of queryTerms) {
    if (fields.title.includes(term)) {
      score += fields.title === term ? 12 : 6;
    }

    if (fields.keywords.includes(term)) {
      score += 8;
    }

    if (fields.tags.includes(term)) {
      score += 5;
    }

    if (fields.topic.includes(term)) {
      score += 4;
    }

    if (fields.content.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function cloneAndFreezeEntry(entry, datasetId, searchScore) {
  return Object.freeze({
    ...entry,
    keywords: Object.freeze(
      Array.isArray(entry.keywords)
        ? [...entry.keywords]
        : []
    ),
    tags: Object.freeze(
      Array.isArray(entry.tags)
        ? [...entry.tags]
        : []
    ),
    datasetId,
    searchScore
  });
}

function compareMatches(first, second) {
  if (second.searchScore !== first.searchScore) {
    return second.searchScore - first.searchScore;
  }

  const statusDifference =
    getStatusRank(second.status) - getStatusRank(first.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const idDifference = String(first.id).localeCompare(
    String(second.id)
  );

  if (idDifference !== 0) {
    return idDifference;
  }

  return String(first.datasetId).localeCompare(
    String(second.datasetId)
  );
}

function getDatasetId(dataset, fallbackId) {
  if (
    dataset &&
    typeof dataset.id === "string" &&
    dataset.id.trim()
  ) {
    return dataset.id;
  }

  return fallbackId;
}

export function createKnowledgeDatasetSearchAdapter({
  registry
} = {}) {
  if (
    !isPlainObject(registry) ||
    typeof registry.listDatasets !== "function" ||
    typeof registry.getDataset !== "function"
  ) {
    throw new TypeError(
      "Kërkohet një registry i vlefshëm për kërkimin e dataset-eve."
    );
  }

  function getMetadata() {
    return Object.freeze({
      engine: ENGINE_NAME,
      version: ENGINE_VERSION
    });
  }

  function search(query, options = {}) {
    if (options === null || !isPlainObject(options)) {
      return createErrorResult(
        "Opsionet e kërkimit duhet të jenë një objekt i vlefshëm."
      );
    }

    if (typeof query !== "string" || !query.trim()) {
      return createErrorResult(
        "Pyetja e kërkimit nuk mund të jetë bosh."
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return createErrorResult(
        "Pyetja e kërkimit është tepër e gjatë."
      );
    }

    const normalizedQuery = normalizeForSearch(query);

    if (!normalizedQuery) {
      return createErrorResult(
        "Pyetja e kërkimit nuk përmban tekst të vlefshëm."
      );
    }

    const requestedLanguage = normalizeLanguage(
      options.language
    );

    const requestedDomain = normalizeDomain(
      options.domain
    );

    const rawLimit = Number.isFinite(options.limit)
      ? Math.trunc(options.limit)
      : DEFAULT_LIMIT;

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, rawLimit)
    );

    const queryTerms = normalizedQuery
      .split(/\s+/u)
      .filter(Boolean);

    let datasetSummaries;

    try {
      datasetSummaries = registry.listDatasets();
    } catch {
      return createErrorResult(
        "Nuk mund të lexohen dataset-et nga registry.",
        {
          query: normalizedQuery,
          language: requestedLanguage,
          domain: requestedDomain,
          limit
        }
      );
    }

    if (!Array.isArray(datasetSummaries)) {
      return createErrorResult(
        "Registry ktheu një listë të pavlefshme dataset-esh.",
        {
          query: normalizedQuery,
          language: requestedLanguage,
          domain: requestedDomain,
          limit
        }
      );
    }

    const matches = [];
    const seenEntryKeys = new Set();
    let validDatasetCount = 0;

    for (const summary of datasetSummaries) {
      if (
        !isPlainObject(summary) ||
        typeof summary.id !== "string" ||
        !summary.id.trim()
      ) {
        continue;
      }

      let dataset;

      try {
        dataset = registry.getDataset(summary.id);
      } catch {
        // Një dataset i dëmtuar nuk duhet të ndalë kërkimin.
        continue;
      }

      if (!dataset) {
        continue;
      }

      validDatasetCount += 1;

      const datasetId = getDatasetId(dataset, summary.id);
      const entries = getDatasetEntries(dataset);

      for (const entry of entries) {
        if (!isValidSearchEntry(entry)) {
          continue;
        }

        if (
          !matchesLanguage(entry.language, requestedLanguage)
        ) {
          continue;
        }

        if (!matchesDomain(entry.domain, requestedDomain)) {
          continue;
        }

        const searchableText = getSearchableText(entry);

        const isMatch =
          searchableText.includes(normalizedQuery) ||
          queryTerms.some((term) =>
            searchableText.includes(term)
          );

        if (!isMatch) {
          continue;
        }

        const entryKey = `${datasetId}:${entry.id}`;

        if (seenEntryKeys.has(entryKey)) {
          continue;
        }

        seenEntryKeys.add(entryKey);

        matches.push(
          cloneAndFreezeEntry(
            entry,
            datasetId,
            scoreEntry(entry, normalizedQuery, queryTerms)
          )
        );
      }
    }

    matches.sort(compareMatches);

    const results = matches.slice(0, limit);

    return {
      success: true,
      results,
      metadata: createMetadata({
        query: normalizedQuery,
        language: requestedLanguage,
        domain: requestedDomain,
        resultCount: results.length,
        matchedCount: matches.length,
        limit,
        datasetCount: validDatasetCount
      })
    };
  }

  return Object.freeze({
    search,
    getMetadata
  });
}

export function createKnowledgeDatasetSearchProvider({
  registry
} = {}) {
  const adapter = createKnowledgeDatasetSearchAdapter({
    registry
  });

  return Object.freeze({
    searchKnowledgeDataset: adapter.search,
    getMetadata: adapter.getMetadata
  });
}
