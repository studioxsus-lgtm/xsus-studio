/**
 * XSUS AI — Knowledge Dataset Registry
 * Version: 1.3.0
 *
 * Regjistër në memorie për dataset-et e validuara.
 * Përfshin kërkimin mbi hyrjet e regjistruara.
 * Ruajtja e API-së ekzistuese për listDatasets().
 */

import {
  validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

const ENGINE_NAME = "xsus-knowledge-dataset-registry";
const ENGINE_VERSION = "1.3.0";
const MAX_DATASET_ID_LENGTH = 120;
const DEFAULT_DATASET_VERSION = "1.0.0";
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

const DATASET_ID_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;

const DATASET_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

function normalizeDatasetId(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      "ID e dataset-it duhet të jetë tekst."
    );
  }

  const id = value.normalize("NFC").trim();

  if (
    !id ||
    id.length > MAX_DATASET_ID_LENGTH ||
    !DATASET_ID_PATTERN.test(id)
  ) {
    throw new TypeError(
      "ID e dataset-it nuk është e vlefshme."
    );
  }

  return id;
}

function normalizeDatasetVersion(value) {
  if (value === undefined) {
    return DEFAULT_DATASET_VERSION;
  }

  if (
    typeof value !== "string" ||
    !DATASET_VERSION_PATTERN.test(value)
  ) {
    throw new TypeError(
      "Versioni i dataset-it duhet të jetë në formatin X.Y.Z."
    );
  }

  return value;
}

function createRegistryResult(success, fields = {}) {
  return {
    success,
    ...fields,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION
    }
  };
}

function normalizeSearchLimit(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_SEARCH_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.max(
    1,
    Math.min(Math.floor(parsed), MAX_SEARCH_LIMIT)
  );
}

function getBaseLanguage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "auto";
  }

  const normalized = normalizeLanguageCode(value);

  return normalized === "auto"
    ? "auto"
    : normalized.split("-")[0];
}

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

function getEntrySearchText(entry) {
  const parts = [
    entry.id,
    entry.title,
    entry.content,
    entry.topic,
    ...(Array.isArray(entry.keywords) ? entry.keywords : []),
    ...(Array.isArray(entry.tags) ? entry.tags : [])
  ];

  return normalizeForSearch(
    parts
      .filter(value => typeof value === "string")
      .join(" ")
  );
}

function scoreEntry(entry, normalizedQuery, queryTokens) {
  const title = normalizeForSearch(entry.title || "");
  const content = normalizeForSearch(entry.content || "");
  const searchableText = getEntrySearchText(entry);

  let score = 0;

  if (title === normalizedQuery) {
    score += 20;
  } else if (title.includes(normalizedQuery)) {
    score += 12;
  }

  if (content.includes(normalizedQuery)) {
    score += 8;
  }

  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 4;
    } else if (searchableText.includes(token)) {
      score += 1;
    }
  }

  if (entry.status === "verified") {
    score += 2;
  } else if (entry.status === "reviewed") {
    score += 1;
  }

  return score;
}

export function createKnowledgeDatasetRegistry() {
  const datasets = new Map();

  function createRecord(id, entries, datasetVersion) {
    const validation = validateKnowledgeDataset(entries);

    if (!validation.valid) {
      return {
        success: false,
        error: "Dataset-i nuk kaloi validimin.",
        validationErrors: validation.errors
      };
    }

    return {
      success: true,
      record: Object.freeze({
        id,
        collection: validation.collection,
        entryCount: validation.collection.length,
        schemaVersion: validation.metadata.schemaVersion,
        datasetVersion
      })
    };
  }

  /**
   * Regjistron një dataset të ri.
   * Nuk mbishkruan ID ekzistuese.
   */
  function registerDataset(datasetId, entries, options = {}) {
    let id;
    let datasetVersion;

    try {
      id = normalizeDatasetId(datasetId);
      datasetVersion = normalizeDatasetVersion(
        options?.datasetVersion
      );
    } catch (error) {
      return createRegistryResult(false, {
        datasetId: null,
        error: error.message
      });
    }

    if (datasets.has(id)) {
      return createRegistryResult(false, {
        datasetId: id,
        error: `Dataset-i "${id}" është regjistruar tashmë.`
      });
    }

    const result = createRecord(
      id,
      entries,
      datasetVersion
    );

    if (!result.success) {
      return createRegistryResult(false, {
        datasetId: id,
        error: result.error,
        validationErrors: result.validationErrors
      });
    }

    datasets.set(id, result.record);

    return createRegistryResult(true, {
      datasetId: id,
      dataset: result.record
    });
  }

  /**
   * Zëvendëson një dataset vetëm pas validimit.
   */
  function replaceDataset(datasetId, entries, options = {}) {
    let id;
    let datasetVersion;

    try {
      id = normalizeDatasetId(datasetId);
      datasetVersion = normalizeDatasetVersion(
        options?.datasetVersion
      );
    } catch (error) {
      return createRegistryResult(false, {
        datasetId: null,
        replaced: false,
        error: error.message
      });
    }

    if (!datasets.has(id)) {
      return createRegistryResult(false, {
        datasetId: id,
        replaced: false,
        error: `Dataset-i "${id}" nuk u gjet.`
      });
    }

    const result = createRecord(
      id,
      entries,
      datasetVersion
    );

    if (!result.success) {
      return createRegistryResult(false, {
        datasetId: id,
        replaced: false,
        error: result.error,
        validationErrors: result.validationErrors
      });
    }

    const previousDataset = datasets.get(id);

    datasets.set(id, result.record);

    return createRegistryResult(true, {
      datasetId: id,
      replaced: true,
      previousDataset,
      dataset: result.record
    });
  }

  /**
   * Kthen dataset-in e plotë ose null.
   */
  function getDataset(datasetId) {
    let id;

    try {
      id = normalizeDatasetId(datasetId);
    } catch {
      return null;
    }

    return datasets.get(id) ?? null;
  }

  /**
   * Ruhet struktura publike ekzistuese.
   */
  function listDatasets() {
    return Array.from(datasets.values(), dataset => ({
      id: dataset.id,
      entryCount: dataset.entryCount,
      schemaVersion: dataset.schemaVersion
    }));
  }

  /**
   * Kërkon në hyrjet e dataset-eve të regjistruara.
   *
   * @param {string} query Pyetja e kërkimit.
   * @param {Object} options Filtrat e gjuhës, fushës dhe limitit.
   */
  function search(query, options = {}) {
    if (typeof query !== "string" || !query.trim()) {
      return {
        success: false,
        query: "",
        results: [],
        error: "Shkruaj një pyetje për të kërkuar në dataset-e.",
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          resultCount: 0
        }
      };
    }

    const safeOptions = isPlainObject(options) ? options : {};
    const normalizedQuery = normalizeForSearch(query);
    const language = getBaseLanguage(
      safeOptions.language || "auto"
    );
    const domain =
      typeof safeOptions.domain === "string"
        ? safeOptions.domain.trim().toLowerCase()
        : "";

    const limit = normalizeSearchLimit(safeOptions.limit);

    const queryTokens = [
      ...new Set(
        normalizedQuery.split(/\s+/u).filter(Boolean)
      )
    ];

    const results = [];

    for (const dataset of datasets.values()) {
      for (const entry of dataset.collection) {
        if (!isPlainObject(entry)) {
          continue;
        }

        if (
          language !== "auto" &&
          typeof entry.language === "string" &&
          getBaseLanguage(entry.language) !== language
        ) {
          continue;
        }

        if (
          domain &&
          (
            typeof entry.domain !== "string" ||
            entry.domain.trim().toLowerCase() !== domain
          )
        ) {
          continue;
        }

        const searchableText = getEntrySearchText(entry);

        const matched = searchableText.includes(normalizedQuery) ||
          queryTokens.some(token => searchableText.includes(token));

        if (!matched) {
          continue;
        }

        results.push({
          ...entry,
          datasetId: dataset.id,
          searchScore: scoreEntry(
            entry,
            normalizedQuery,
            queryTokens
          )
        });
      }
    }

    results.sort((a, b) => b.searchScore - a.searchScore);

    const finalResults = results.slice(0, limit);

    return {
      success: true,
      query: normalizedQuery,
      results: finalResults,
      metadata: {
        engine: ENGINE_NAME,
        version: ENGINE_VERSION,
        requestedLanguage: language,
        requestedDomain: domain || null,
        totalMatches: results.length,
        resultCount: finalResults.length,
        datasetCount: datasets.size
      }
    };
  }

  /**
   * Heq dataset-in me ID të dhënë.
   */
  function removeDataset(datasetId) {
    let id;

    try {
      id = normalizeDatasetId(datasetId);
    } catch (error) {
      return createRegistryResult(false, {
        datasetId: null,
        error: error.message,
        removed: false
      });
    }

    const removed = datasets.delete(id);

    return createRegistryResult(removed, {
      datasetId: id,
      removed,
      ...(removed
        ? {}
        : {
            error: `Dataset-i "${id}" nuk u gjet.`
          })
    });
  }

  return Object.freeze({
    registerDataset,
    replaceDataset,
    getDataset,
    listDatasets,
    search,
    removeDataset
  });
}

export default createKnowledgeDatasetRegistry;
