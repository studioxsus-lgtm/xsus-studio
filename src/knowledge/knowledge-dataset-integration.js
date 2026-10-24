/**
 * XSUS AI — Knowledge Dataset Integration
 * Version: 1.3.0
 *
 * Përgjegjësitë:
 * - Integrimi i registry/pipeline me Knowledge Service.
 * - Mbështetja e burimeve me emra unikë.
 * - Kërkimi përmes API-së së përshtatshme.
 * - Normalizimi dhe identiteti i rezultateve.
 * - Çregjistrimi i sigurt dhe idempotent.
 */

import {
  registerKnowledgeSource,
  hasKnowledgeSource
} from "./knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const ENGINE_NAME = "xsus-knowledge-dataset-integration";
const ENGINE_VERSION = "1.3.0";

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

function normalizeSourceName(sourceName) {
  if (
    typeof sourceName !== "string" ||
    !sourceName.trim()
  ) {
    return SOURCE_NAME;
  }

  return sourceName.trim();
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

function resolveSearchFunction(registry) {
  if (registry && typeof registry.search === "function") {
    return registry.search.bind(registry);
  }

  if (
    registry &&
    typeof registry.searchKnowledgeDataset === "function"
  ) {
    return registry.searchKnowledgeDataset.bind(registry);
  }

  return null;
}

/**
 * Regjistron integrimin e registry/pipeline me Knowledge Service.
 *
 * Pranon objekte që ofrojnë:
 * - search(query, options), ose
 * - searchKnowledgeDataset(query, options).
 *
 * @param {Object} options
 * @param {Object} options.registry Registry ose pipeline.
 * @param {string} options.sourceName Emri unik i burimit.
 * @returns {Object} Rezultati i regjistrimit dhe close().
 */
export function registerKnowledgeDatasetIntegration({
  registry,
  sourceName = SOURCE_NAME
} = {}) {
  const search = resolveSearchFunction(registry);

  if (!search) {
    throw new TypeError(
      "Registry duhet të ofrojë search(query, options) ose searchKnowledgeDataset(query, options)."
    );
  }

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
