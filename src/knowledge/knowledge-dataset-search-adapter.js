
/**
 * XSUS AI Core — Knowledge Dataset Search Adapter
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Kërkimi në dataset-et e regjistruara.
 * - Filtrimi sipas gjuhës dhe domenit.
 * - Renditja deterministe sipas relevancës dhe cilësisë.
 * - Deduplikimi i njohurive identike ndërmjet dataset-eve.
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
const ENGINE_VERSION = "1.1.0";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 8000;

const STATUS_RANK = Object.freeze({
  verified: 3,
  published: 2,
  reviewed: 2,
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

  const normalized = normalizeLanguageCode(value.trim());

  return normalized === "auto" ? "" : normalized;
}

function normalizeDomain(value) {
  if (typeof value !== "string") {
    return "";
  }

  return normalizeText(value);
}

function getBaseLanguage(value) {
  const normalized = normalizeLanguage(value);

  return normalized
    ? normalized.split("-")[0].toLowerCase()
    : "";
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

function normalizeLimit(value) {
  if (value === undefined || value === null) {
    return DEFAULT_LIMIT;
  }

  let parsed;

  try {
    parsed = Number(value);
  } catch {
    return DEFAULT_LIMIT;
  }

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(
    1,
    Math.min(MAX_LIMIT, Math.floor(parsed))
  );
}

/**
 * Mbështet formatet:
 * - { entries: [...] }
 * - { collection: [...] }
 * - { collection: { entries: [...] } }
 * - { collection: { collection: { entries: [...] } } }
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

  if (
    Array.isArray(dataset.collection?.collection?.entries)
  ) {
    return dataset.collection.collection.entries;
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

function tokenize(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized.split(/\s+/u).filter(Boolean);
}

function containsWholeTerm(text, term) {
  if (!text || !term) {
    return false;
  }

  const escaped = term.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&"
  );

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{M}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{M}\\p{N}])`,
    "u"
  );

  return pattern.test(text);
}

function countTermMatches(text, terms) {
  let count = 0;

  for (const term of terms) {
    if (containsWholeTerm(text, term)) {
      count += 1;
    }
  }

  return count;
}

function scoreEntry(entry, query, queryTerms) {
  const title = normalizeText(entry.title);
  const content = normalizeText(entry.content);
  const topic = normalizeText(entry.topic);
  const domain = normalizeDomain(entry.domain);

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

  // Përputhja e drejtpërdrejtë me titullin.
  if (title === query) {
    score += 120;
  } else if (title.includes(query)) {
    score += 70;
  }

  // Tema është tregues i rëndësishëm i relevancës.
  if (topic === query) {
    score += 50;
  } else if (topic.includes(query)) {
    score += 30;
  }

  if (keywords.includes(query)) {
    score += 35;
  }

  if (tags.includes(query)) {
    score += 22;
  }

  if (content.includes(query)) {
    score += 15;
  }

  if (domain === query) {
    score += 10;
  }

  // Përputhjet me fjalë të plota kanë përparësi.
  const titleTerms = countTermMatches(title, queryTerms);
  const topicTerms = countTermMatches(topic, queryTerms);
  const keywordTerms = countTermMatches(keywords, queryTerms);
  const tagTerms = countTermMatches(tags, queryTerms);
  const contentTerms = countTermMatches(content, queryTerms);

  score += titleTerms * 14;
  score += topicTerms * 6;
  score += keywordTerms * 8;
  score += tagTerms * 5;
  score += contentTerms * 2;

  // Bonus modest për hyrjet me status më të besueshëm.
  score += STATUS_RANK[entry.status] ?? 0;

  return score;
}

function getQualityRank(entry) {
  return STATUS_RANK[entry.status] ?? 0;
}

function compareText(first, second) {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

/**
 * Identifikon dublikatat me titull, përmbajtje,
 * gjuhë dhe domen identikë pas normalizimit.
 *
 * ID-ja dhe dataset-i nuk përdoren si pjesë e çelësit,
 * kështu që njohuria mund të identifikohet edhe kur
 * ruhet në dataset-e të ndryshme.
 */
function createDuplicateKey(entry) {
  return JSON.stringify([
    normalizeText(entry.title),
    normalizeText(entry.content),
    normalizeLanguage(entry.language),
    normalizeDomain(entry.domain)
  ]);
}

function compareMatches(first, second) {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  const firstQuality = getQualityRank(first.entry);
  const secondQuality = getQualityRank(second.entry);

  if (secondQuality !== firstQuality) {
    return secondQuality - firstQuality;
  }

  const idComparison = compareText(
    first.entry.id,
    second.entry.id
  );

  if (idComparison !== 0) {
    return idComparison;
  }

  const datasetComparison = compareText(
    first.datasetId,
    second.datasetId
  );

  if (datasetComparison !== 0) {
    return datasetComparison;
  }

  return compareText(
    createDuplicateKey(first.entry),
    createDuplicateKey(second.entry)
  );
}

function deduplicateMatches(matches) {
  const bestByKey = new Map();

  for (const match of matches) {
    const key = createDuplicateKey(match.entry);
    const existing = bestByKey.get(key);

    if (!existing || compareMatches(match, existing) < 0) {
      bestByKey.set(key, match);
    }
  }

  return [...bestByKey.values()];
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
      resultCount: 0,
      matchedCount: 0
    }
  };
}

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

    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return createError(
        "Pyetja nuk përmban tekst të kërkueshëm."
      );
    }

    const requestedLanguage = normalizeLanguage(
      options.language
    );

    const requestedDomain = normalizeDomain(options.domain);
    const limit = normalizeLimit(options.limit);

    const queryTerms = [...new Set(tokenize(normalizedQuery))];

    if (queryTerms.length === 0) {
      return createError(
        "Pyetja nuk përmban tekst të kërkueshëm."
      );
    }

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
    const seenDatasetEntries = new Set();

    for (const summary of datasetSummaries) {
      if (
        !summary ||
        typeof summary.id !== "string" ||
        !summary.id.trim()
      ) {
        continue;
      }

      const datasetId = summary.id.trim();

      let dataset;

      try {
        dataset = registry.getDataset(datasetId);
      } catch {
        // Një dataset i paarritshëm nuk duhet të ndalojë kërkimin.
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
          !entry.title.trim() ||
          typeof entry.content !== "string" ||
          !entry.content.trim()
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
          normalizeDomain(entry.domain) !== requestedDomain
        ) {
          continue;
        }

        // Shmang përsëritjen e së njëjtës ID brenda dataset-it.
        const datasetEntryKey = JSON.stringify([
          datasetId,
          entry.id.trim()
        ]);

        if (seenDatasetEntries.has(datasetEntryKey)) {
          continue;
        }

        seenDatasetEntries.add(datasetEntryKey);

        const searchableText = getSearchableText(entry);

        const hasQueryMatch =
          searchableText.includes(normalizedQuery) ||
          queryTerms.some((term) =>
            containsWholeTerm(searchableText, term)
          );

        if (!hasQueryMatch) {
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

        matches.push({
          entry,
          score,
          datasetId
        });
      }
    }

    // Fillimisht zgjedhim versionin më të mirë të njohurive
    // që janë dublikate, pastaj rendisim rezultatet.
    const uniqueMatches = deduplicateMatches(matches);

    uniqueMatches.sort(compareMatches);

    const results = uniqueMatches
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
        matchedCount: uniqueMatches.length,
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

export function createKnowledgeDatasetSearchProvider(options) {
  const adapter = createKnowledgeDatasetSearchAdapter(options);

  return Object.freeze({
    searchKnowledgeDataset: (query, searchOptions = {}) =>
      adapter.search(query, searchOptions),

    getMetadata: () => adapter.getMetadata()
  });
}
