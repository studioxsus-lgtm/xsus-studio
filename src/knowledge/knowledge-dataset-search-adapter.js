
/**
 * XSUS AI Core — Knowledge Dataset Search Adapter
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kërkimi në dataset-et e regjistruara.
 * - Filtrimi sipas gjuhës dhe domenit.
 * - Renditja sipas relevancës.
 * - Kufizimi i numrit të rezultateve.
 * - Kthimi i rezultateve në format të standardizuar.
 *
 * Ky adapter nuk ndryshon registry-n dhe nuk modifikon dataset-et.
 */

import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

const ENGINE_NAME = "xsus-knowledge-dataset-search-adapter";
const ENGINE_VERSION = "1.0.0";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 8000;

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

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return normalizeForSearch(value);
}

function normalizeLanguage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  return normalizeLanguageCode(value.trim());
}

function matchesLanguage(entryLanguage, requestedLanguage) {
  if (!requestedLanguage) {
    return true;
  }

  const entry = normalizeLanguage(entryLanguage);
  const requested = normalizeLanguage(requestedLanguage);

  if (!entry || !requested) {
    return false;
  }

  return (
    entry === requested ||
    entry.split("-")[0] === requested.split("-")[0]
  );
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
    Math.min(MAX_LIMIT, Math.floor(parsed))
  );
}

/**
 * Merr hyrjet nga formatet e mbështetura të dataset-it.
 *
 * Registry mund t'i ruajë hyrjet te:
 * - dataset.entries
 * - dataset.collection
 * - dataset.collection.entries
 */
function getDatasetEntries(dataset) {
  if (!dataset || typeof dataset !== "object") {
    return null;
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

  return null;
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

  return normalizeText(
    values
      .filter((value) => typeof value === "string")
      .join(" ")
  );
}

function scoreEntry(entry, query, queryTerms) {
  const title = normalizeText(entry.title);
  const content = normalizeText(entry.content);
  const topic = normalizeText(entry.topic);

  const keywords = normalizeText(
    Array.isArray(entry.keywords)
      ? entry.keywords.join(" ")
      : ""
  );

  const tags = normalizeText(
    Array.isArray(entry.tags)
      ? entry.tags.join(" ")
      : ""
  );

  let score = 0;

  if (title === query) {
    score += 100;
  } else if (title.includes(query)) {
    score += 60;
  }

  if (topic === query) {
    score += 40;
  } else if (topic.includes(query)) {
    score += 25;
  }

  if (keywords.includes(query)) score += 35;
  if (tags.includes(query)) score += 20;
  if (content.includes(query)) score += 15;

  for (const term of queryTerms) {
    if (!term) continue;

    if (title.split(/\s+/u).includes(term)) {
      score += 12;
    } else if (title.includes(term)) {
      score += 6;
    }

    if (keywords.includes(term)) score += 8;
    if (tags.includes(term)) score += 5;
    if (topic.includes(term)) score += 4;
    if (content.includes(term)) score += 2;
  }

  const statusRank = {
    verified: 3,
    reviewed: 2,
    draft: 1
  };

  score += statusRank[entry.status] ?? 0;

  return score;
}

function createResult(entry, score) {
  return Object.freeze({
    ...entry,
    keywords: Object.freeze([
      ...(Array.isArray(entry.keywords) ? entry.keywords : [])
    ]),
    tags: Object.freeze([
      ...(Array.isArray(entry.tags) ? entry.tags : [])
    ]),
    searchScore: score,
    searchSource: ENGINE_NAME
  });
}

function createError(message) {
  return {
    success: false,
    results: [],
    error: message,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      resultCount: 0
    }
  };
}

/**
 * Krijon një adapter për një registry ekzistues.
 *
 * Registry duhet të ofrojë:
 * - listDatasets()
 * - getDataset(datasetId)
 */
export function createKnowledgeDatasetSearchAdapter({
  registry
} = {}) {
  if (
    !registry ||
    typeof registry.listDatasets !== "function" ||
    typeof registry.getDataset !== "function"
  ) {
    throw new TypeError(
      "Registry duhet të ofrojë listDatasets() dhe getDataset()."
    );
  }

  function search(query, options = {}) {
    if (typeof query !== "string" || !query.trim()) {
      return createError(
        "Pyetja e kërkimit është bosh ose e pavlefshme."
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return createError(
        "Pyetja e kërkimit është tepër e gjatë."
      );
    }

    if (!isPlainObject(options)) {
      return createError(
        "Opsionet e kërkimit janë të pavlefshme."
      );
    }

    const normalizedQuery = normalizeText(query.trim());

    if (!normalizedQuery) {
      return createError(
        "Pyetja nuk përmban tekst të kërkueshëm."
      );
    }

    const requestedLanguage = normalizeLanguage(
      options.language
    );

    const requestedDomain =
      typeof options.domain === "string"
        ? options.domain.trim()
        : "";

    const limit = normalizeLimit(options.limit);

    const queryTerms = [
      ...new Set(
        normalizedQuery
          .split(/\s+/u)
          .filter(Boolean)
      )
    ];

    let datasetSummaries;

    try {
      datasetSummaries = registry.listDatasets();
    } catch {
      return createError(
        "Nuk mund të lexohen dataset-et e regjistruara."
      );
    }

    if (!Array.isArray(datasetSummaries)) {
      return createError(
        "Registry ktheu një listë dataset-esh të pavlefshme."
      );
    }

    const matches = [];
    const seenEntryIds = new Set();

    for (const summary of datasetSummaries) {
      if (
        !summary ||
        typeof summary.id !== "string" ||
        !summary.id.trim()
      ) {
        continue;
      }

      let dataset;

      try {
        dataset = registry.getDataset(summary.id);
      } catch {
        continue;
      }

      const entries = getDatasetEntries(dataset);

      if (!entries) {
        continue;
      }

      for (const entry of entries) {
        if (!isPlainObject(entry)) {
          continue;
        }

        if (
          typeof entry.id !== "string" ||
          !entry.id.trim() ||
          typeof entry.title !== "string" ||
          typeof entry.content !== "string"
        ) {
          continue;
        }

        if (
          requestedLanguage &&
          !matchesLanguage(entry.language, requestedLanguage)
        ) {
          continue;
        }

        if (
          requestedDomain &&
          entry.domain !== requestedDomain
        ) {
          continue;
        }

        const searchableText = getSearchableText(entry);

        const hasQueryMatch =
          searchableText.includes(normalizedQuery) ||
          queryTerms.some((term) =>
            searchableText.includes(term)
          );

        if (!hasQueryMatch) {
          continue;
        }

        if (seenEntryIds.has(entry.id)) {
          continue;
        }

        const score = scoreEntry(
          entry,
          normalizedQuery,
          queryTerms
        );

        if (score <= 0) {
          continue;
        }

        seenEntryIds.add(entry.id);

        matches.push({
          entry,
          score,
          datasetId: summary.id
        });
      }
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.entry.id.localeCompare(b.entry.id);
    });

    const results = matches
      .slice(0, limit)
      .map(({ entry, score, datasetId }) =>
        createResult(
          {
            ...entry,
            datasetId
          },
          score
        )
      );

    return {
      success: true,
      results,
      metadata: {
        engine: ENGINE_NAME,
        version: ENGINE_VERSION,
        query: normalizedQuery,
        language: requestedLanguage || null,
        domain: requestedDomain || null,
        limit,
        resultCount: results.length,
        matchedCount: matches.length,
        datasetCount: datasetSummaries.length
      }
    };
  }

  return Object.freeze({
    search,

    getMetadata() {
      return Object.freeze({
        engine: ENGINE_NAME,
        version: ENGINE_VERSION
      });
    }
  });
}

/**
 * Krijon një funksion kërkimi të përshtatshëm
 * për integrim të mëvonshëm me knowledge-service.js.
 */
export function createKnowledgeDatasetSearchProvider(options) {
  const adapter = createKnowledgeDatasetSearchAdapter(options);

  return Object.freeze({
    searchKnowledgeDataset: (query, searchOptions = {}) =>
      adapter.search(query, searchOptions),

    getMetadata: () => adapter.getMetadata()
  });
}
