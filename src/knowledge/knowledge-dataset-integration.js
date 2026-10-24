
/**
 * XSUS AI — Knowledge Dataset Integration
 * Version: 1.2.2
 *
 * Përgjegjësitë:
 * - Integrimi i dataset-eve me Knowledge Service.
 * - Mbështetja e registry-t dhe pipeline-it.
 * - Normalizimi i rezultateve.
 * - Ruajtja e identitetit të burimit.
 * - Çregjistrimi i sigurt i integrimit.
 */

import {
  registerKnowledgeSource,
  hasKnowledgeSource
} from "./knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const ENGINE_NAME = "xsus-knowledge-dataset-integration";
const ENGINE_VERSION = "1.2.2";

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
  if (typeof value !== "string" || !value.trim()) {
    return SOURCE_NAME;
  }

  return value.trim();
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

function normalizeText(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase()
    : "";
}

function getDatasetEntries(dataset) {
  if (Array.isArray(dataset)) {
    return dataset;
  }

  if (Array.isArray(dataset?.collection)) {
    return dataset.collection;
  }

  if (Array.isArray(dataset?.entries)) {
    return dataset.entries;
  }

  if (Array.isArray(dataset?.collection?.entries)) {
    return dataset.collection.entries;
  }

  if (Array.isArray(dataset?.collection?.collection)) {
    return dataset.collection.collection;
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
          normalizeText(entry.language).split(/[-_]/u)[0] !==
            language
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
            .filter(value => typeof value === "string")
            .join(" ")
        );

        if (normalizedQuery) {
          const tokens = normalizedQuery
            .split(/\s+/u)
            .filter(Boolean);

          const matches =
            searchable.includes(normalizedQuery) ||
            tokens.some(token => searchable.includes(token));

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

    const requestedLimit = Number(options.limit);

    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), 50))
      : 10;

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
  // Pipeline-i ofron metodën search().
  if (typeof registry.search === "function") {
    return (query, options = {}) =>
      registry.search(query, options);
  }

  // Registry i drejtpërdrejtë përdor listDatasets()
  // dhe getDataset() për të kërkuar në koleksione.
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
 * @param {string} options.sourceName Emri i burimit.
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

  const search = createSearchFunction(registry);
  const resolvedSourceName = normalizeSourceName(sourceName);

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
        limit: safeOptions.limit
      });

      if (response?.success === false) {
        return {
          success: false,
          results: [],
          error:
            typeof response.error === "string"
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
