
/**
 * XSUS AI — Knowledge Dataset Integration
 * Version: 1.2.5
 *
 * Përgjegjësitë:
 * - Integrimi i dataset-eve me Knowledge Service.
 * - Mbështetja e registry-t dhe pipeline-it.
 * - Normalizimi dhe validimi i rezultateve.
 * - Ruajtja e identitetit të burimit.
 * - Çregjistrimi i sigurt i integrimit.
 * - Mbështetja e emrave unikë të burimeve.
 */

import {
  registerKnowledgeSource,
  hasKnowledgeSource
} from "./knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const ENGINE_NAME = "xsus-knowledge-dataset-integration";
const ENGINE_VERSION = "1.2.5";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_SOURCE_NAME_LENGTH = 100;

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

function normalizeSourceName(value) {
  if (value === undefined) {
    return SOURCE_NAME;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      "Emri i burimit duhet të jetë tekst jo bosh."
    );
  }

  const name = value.trim();

  if (name.length > MAX_SOURCE_NAME_LENGTH) {
    throw new TypeError(
      `Emri i burimit nuk mund të kalojë ${MAX_SOURCE_NAME_LENGTH} karaktere.`
    );
  }

  return name;
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase()
    : "";
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

function normalizeEntries(response, sourceName) {
  const entries = Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : [];

  return entries
    .filter(
      entry =>
        isPlainObject(entry) &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0
    )
    .map(entry => ({
      ...entry,
      source: sourceName
    }));
}

function getDatasetEntries(dataset) {
  if (Array.isArray(dataset)) {
    return dataset;
  }

  if (!isPlainObject(dataset)) {
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

  if (Array.isArray(dataset.collection?.collection)) {
    return dataset.collection.collection;
  }

  if (
    Array.isArray(
      dataset.collection?.collection?.entries
    )
  ) {
    return dataset.collection.collection.entries;
  }

  return [];
}

function createDirectRegistrySearch(registry) {
  return (query, options = {}) => {
    const normalizedQuery = normalizeText(query);

    const language = normalizeText(options.language)
      .split(/[-_]/u)[0];

    const domain = normalizeText(options.domain);
    const summaries = registry.listDatasets();

    if (!Array.isArray(summaries)) {
      return {
        success: false,
        results: [],
        error:
          "Registry nuk ktheu listë të vlefshme dataset-esh."
      };
    }

    const results = [];

    for (const summary of summaries) {
      const datasetId =
        typeof summary?.id === "string"
          ? summary.id
          : typeof summary?.datasetId === "string"
            ? summary.datasetId
            : null;

      if (!datasetId) {
        continue;
      }

      const dataset = registry.getDataset(datasetId);

      if (!dataset) {
        continue;
      }

      for (const entry of getDatasetEntries(dataset)) {
        if (
          !isPlainObject(entry) ||
          typeof entry.content !== "string" ||
          !entry.content.trim()
        ) {
          continue;
        }

        if (
          language &&
          normalizeText(entry.language)
            .split(/[-_]/u)[0] !== language
        ) {
          continue;
        }

        if (
          domain &&
          normalizeText(entry.domain) !== domain
        ) {
          continue;
        }

        const searchable = normalizeText(
          [
            entry.id,
            entry.title,
            entry.content,
            ...(Array.isArray(entry.keywords)
              ? entry.keywords
              : []),
            ...(Array.isArray(entry.tags)
              ? entry.tags
              : [])
          ]
            .filter(
              value => typeof value === "string"
            )
            .join(" ")
        );

        if (normalizedQuery) {
          const tokens = normalizedQuery
            .split(/\s+/u)
            .filter(Boolean);

          const matches =
            searchable.includes(normalizedQuery) ||
            tokens.some(
              token => searchable.includes(token)
            );

          if (!matches) {
            continue;
          }
        }

        results.push({
          ...entry,
          datasetId
        });
      }
    }

    const limit = normalizeLimit(options.limit);

    return {
      success: true,
      results: results.slice(0, limit),
      metadata: {
        engine: ENGINE_NAME,
        version: ENGINE_VERSION,
        datasetCount: summaries.length,
        resultCount: Math.min(results.length, limit)
      }
    };
  };
}

function createSearchFunction(registry) {
  if (typeof registry.search === "function") {
    return (query, options = {}) =>
      registry.search(query, options);
  }

  if (
    typeof registry.listDatasets === "function" &&
    typeof registry.getDataset === "function"
  ) {
    return createDirectRegistrySearch(registry);
  }

  throw new TypeError(
    "Registry duhet të ofrojë search(query, options), " +
    "ose listDatasets() dhe getDataset()."
  );
}

/**
 * Regjistron integrimin me Knowledge Service.
 *
 * @param {Object} options
 * @param {Object} options.registry Registry ose pipeline.
 * @param {string} [options.sourceName] Emri unik i burimit.
 * @returns {Object} Rezultati i regjistrimit.
 */
export function registerKnowledgeDatasetIntegration({
  registry,
  sourceName = SOURCE_NAME
} = {}) {
  if (!registry || typeof registry !== "object") {
    throw new TypeError(
      "Duhet të jepet një registry ose pipeline i vlefshëm."
    );
  }

  const resolvedSourceName =
    normalizeSourceName(sourceName);

  const search = createSearchFunction(registry);

  if (hasKnowledgeSource(resolvedSourceName)) {
    return {
      success: false,
      source: resolvedSourceName,
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      error:
        `Burimi "${resolvedSourceName}" është regjistruar tashmë.`,
      close() {
        return false;
      },
      unregister() {
        return false;
      }
    };
  }

  const provider = async (query, options = {}) => {
    try {
      const safeOptions = isPlainObject(options)
        ? options
        : {};

      const response = await search(query, {
        language: safeOptions.language,
        domain: safeOptions.domain,
        limit: normalizeLimit(safeOptions.limit)
      });

      if (
        response === null ||
        response === undefined ||
        response?.success === false
      ) {
        return {
          success: false,
          results: [],
          error:
            typeof response?.error === "string"
              ? response.error
              : "Kërkimi në knowledge datasets dështoi."
        };
      }

      return {
        success: true,
        results: normalizeEntries(
          response,
          resolvedSourceName
        ),
        metadata: {
          ...(isPlainObject(response?.metadata)
            ? response.metadata
            : {}),
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          source: resolvedSourceName
        }
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error:
          error instanceof Error
            ? error.message
            : "Ndodhi një gabim gjatë kërkimit në datasets."
      };
    }
  };

  const unregisterSource = registerKnowledgeSource(
    resolvedSourceName,
    provider
  );

  let closed = false;

  function close() {
    if (closed) {
      return false;
    }

    closed = true;
    unregisterSource();

    return true;
  }

  return {
    success: true,
    source: resolvedSourceName,
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    close,
    unregister: close
  };
}

export {
  SOURCE_NAME as KNOWLEDGE_DATASET_SOURCE_NAME
};

export default registerKnowledgeDatasetIntegration;
