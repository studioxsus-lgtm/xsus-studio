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

  return prototype === Object.prototype || prototype === null;
}

function normalizeLanguage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = normalizeLanguageCode(value);

  return normalized === "auto" ? null : normalized;
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

  if (Array.isArray(dataset.collection?.collection?.entries)) {
    return dataset.collection.collection.entries;
  }

  return [];
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
  return STATUS_RANK[
    typeof status === "string" ? status.toLowerCase() : ""
  ] || 0;
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
    if (!term) continue;

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
  const keywords = Object.freeze(
    Array.isArray(entry.keywords)
      ? [...entry.keywords]
      : []
  );

  const tags = Object.freeze(
    Array.isArray(entry.tags)
      ? [...entry.tags]
      : []
  );

  return Object.freeze({
    ...entry,
    keywords,
    tags,
    datasetId,
    searchScore
  });
}

function compareMatches(first, second) {
  if (second.searchScore !== first.searchScore) {
    return second.searchScore - first.searchScore;
  }

  const firstStatus = getStatusRank(first.status);
  const secondStatus = getStatusRank(second.status);

  if (secondStatus !== firstStatus) {
    return secondStatus - firstStatus;
  }

  const idComparison = String(first.id || "").localeCompare(
    String(second.id || "")
  );

  if (idComparison !== 0) {
    return idComparison;
  }

  return String(first.datasetId || "").localeCompare(
    String(second.datasetId || "")
  );
}

function getDatasetId(dataset, fallbackId) {
  if (dataset && typeof dataset.id === "string" && dataset.id) {
    return dataset.id;
  }

  return fallbackId;
}

function getRegistryDatasets(registry) {
  const datasets = registry.listDatasets();

  if (!Array.isArray(datasets)) {
    return [];
  }

  return datasets;
}

function getRegistryDataset(registry, datasetSummary) {
  if (!datasetSummary || typeof datasetSummary.id !== "string") {
    return null;
  }

  return registry.getDataset(datasetSummary.id);
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
      "Një registry i vlefshëm kërkohet për kërkimin e dataset-eve."
    );
  }

  function getMetadata() {
    return Object.freeze({
      engine: ENGINE_NAME,
      version: ENGINE_VERSION
    });
  }

  function search(query, options = {}) {
    if (typeof query !== "string" || !query.trim()) {
      return {
        success: false,
        results: [],
        error: "Pyetja e kërkimit nuk mund të jetë bosh.",
        metadata: {
          ...getMetadata(),
          resultCount: 0,
          matchedCount: 0,
          limit: DEFAULT_LIMIT,
          datasetCount: 0
        }
      };
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return {
        success: false,
        results: [],
        error: "Pyetja e kërkimit është tepër e gjatë.",
        metadata: {
          ...getMetadata(),
          resultCount: 0,
          matchedCount: 0,
          limit: DEFAULT_LIMIT,
          datasetCount: 0
        }
      };
    }

    if (!isPlainObject(options)) {
      options = {};
    }

    const normalizedQuery = normalizeForSearch(query);

    if (!normalizedQuery) {
      return {
        success: false,
        results: [],
        error: "Pyetja e kërkimit nuk përmban tekst të vlefshëm.",
        metadata: {
          ...getMetadata(),
          resultCount: 0,
          matchedCount: 0,
          limit: DEFAULT_LIMIT,
          datasetCount: 0
        }
      };
    }

    const queryTerms = normalizedQuery.split(/\s+/u).filter(Boolean);

    const requestedLanguage = normalizeLanguage(options.language);
    const requestedDomain = normalizeDomain(options.domain);

    const rawLimit = Number.isFinite(options.limit)
      ? Math.trunc(options.limit)
      : DEFAULT_LIMIT;

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, rawLimit)
    );

    const datasetSummaries = getRegistryDatasets(registry);
    const matches = [];
    const seenEntryKeys = new Set();

    for (const summary of datasetSummaries) {
      const dataset = getRegistryDataset(registry, summary);

      if (!dataset) {
        continue;
      }

      const datasetId = getDatasetId(dataset, summary.id);
      const entries = getDatasetEntries(dataset);

      for (const entry of entries) {
        if (!entry || typeof entry !== "object") {
          continue;
        }

        if (!matchesLanguage(entry.language, requestedLanguage)) {
          continue;
        }

        if (!matchesDomain(entry.domain, requestedDomain)) {
          continue;
        }

        const searchableText = getSearchableText(entry);

        const isMatch =
          searchableText.includes(normalizedQuery) ||
          queryTerms.some((term) => searchableText.includes(term));

        if (!isMatch) {
          continue;
        }

        const entryKey = `${datasetId}:${String(entry.id || "")}`;

        if (seenEntryKeys.has(entryKey)) {
          continue;
        }

        seenEntryKeys.add(entryKey);

        const searchScore = scoreEntry(
          entry,
          normalizedQuery,
          queryTerms
        );

        matches.push(
          cloneAndFreezeEntry(entry, datasetId, searchScore)
        );
      }
    }

    matches.sort(compareMatches);

    const results = matches.slice(0, limit);

    return {
      success: true,
      results,
      metadata: {
        ...getMetadata(),
        language: requestedLanguage || "auto",
        domain: requestedDomain,
        resultCount: results.length,
        matchedCount: matches.length,
        limit,
        datasetCount: datasetSummaries.length
      }
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
