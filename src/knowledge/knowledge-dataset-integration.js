
/**
 * XSUS AI — Knowledge Dataset Integration
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Integrimi i knowledge datasets me Knowledge Service.
 * - Mbështetja e emrave unikë për burimet.
 * - Normalizimi i rezultateve të kërkimit.
 * - Ruajtja e identitetit të burimit në çdo rezultat.
 * - Çregjistrimi i sigurt i integrimit.
 */

import {
  registerKnowledgeSource,
  hasKnowledgeSource
} from "./knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const ENGINE_NAME = "xsus-knowledge-dataset-integration";
const ENGINE_VERSION = "1.2.0";

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

/**
 * Regjistron integrimin e një registry me Knowledge Service.
 *
 * registry duhet të ofrojë:
 * - search(query, options)
 *
 * @param {Object} options
 * @param {Object} options.registry Registry ose pipeline i datasets.
 * @param {string} options.sourceName Emri unik i burimit.
 * @returns {Object} Rezultati i regjistrimit dhe funksioni close().
 */
export function registerKnowledgeDatasetIntegration({
  registry,
  sourceName = SOURCE_NAME
} = {}) {
  if (
    !registry ||
    typeof registry.search !== "function"
  ) {
    throw new TypeError(
      "Registry duhet të ofrojë funksionin search(query, options)."
    );
  }

  const resolvedSourceName =
    normalizeSourceName(sourceName);

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
      }
    };
  }

  const provider = async (query, options = {}) => {
    try {
      const safeOptions = isPlainObject(options)
        ? options
        : {};

      const response = await registry.search(query, {
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
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          source: resolvedSourceName,
          ...(isPlainObject(response?.metadata)
            ? response.metadata
            : {})
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

  const unregister = registerKnowledgeSource(
    resolvedSourceName,
    provider
  );

  let closed = false;

  return {
    success: true,
    source: resolvedSourceName,
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,

    close() {
      if (closed) {
        return false;
      }

      closed = true;
      unregister();

      return true;
    },

    unregister() {
      if (closed) {
        return false;
      }

      closed = true;
      unregister();

      return true;
    }
  };
}

export {
  SOURCE_NAME as KNOWLEDGE_DATASET_SOURCE_NAME
};

export default registerKnowledgeDatasetIntegration;
