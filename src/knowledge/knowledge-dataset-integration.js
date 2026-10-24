
/**
 * XSUS AI Core — Knowledge Dataset Integration
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i dataset-eve si burim njohurish.
 * - Mbështetja e emrave të personalizuar të burimeve.
 * - Normalizimi i rezultateve.
 * - Izolimi i gabimeve të provider-it.
 * - Ruajtja e kontratës së knowledge-service.js.
 * - Çregjistrimi i sigurt i burimit.
 */

import {
  registerKnowledgeSource
} from "./knowledge-service.js";

import {
  createKnowledgeDatasetSearchProvider
} from "./knowledge-dataset-search-adapter.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const DEFAULT_ERROR_MESSAGE = "Kërkimi në dataset dështoi.";

function createFailureResult(error, metadata = null) {
  return {
    success: false,
    results: [],
    error:
      typeof error === "string" && error.trim()
        ? error
        : DEFAULT_ERROR_MESSAGE,
    metadata
  };
}

function normalizeSearchOptions(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    return null;
  }

  return {
    language: options.language,
    domain: options.domain,
    limit: options.limit
  };
}

function normalizeProviderResult(result, sourceName) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    return createFailureResult(DEFAULT_ERROR_MESSAGE);
  }

  if (result.success !== true) {
    return createFailureResult(
      result.error,
      result.metadata ?? null
    );
  }

  if (!Array.isArray(result.results)) {
    return createFailureResult(
      "Provider-i ktheu rezultate në format të pavlefshëm.",
      result.metadata ?? null
    );
  }

  const results = result.results
    .filter((entry) =>
      entry !== null &&
      typeof entry === "object" &&
      !Array.isArray(entry)
    )
    .map((entry) => ({
      ...entry,
      source: sourceName
    }));

  return {
    success: true,
    results,
    metadata: result.metadata ?? null
  };
}

/**
 * Regjistron një burim dataset-esh në knowledge-service.
 *
 * @param {object} options
 * @param {object} options.registry Regjistri i dataset-eve.
 * @param {string} options.sourceName Emër opsional unik i burimit.
 */
export function registerKnowledgeDatasetIntegration({
  registry,
  sourceName = SOURCE_NAME
} = {}) {
  if (
    typeof sourceName !== "string" ||
    !sourceName.trim() ||
    sourceName.trim().length > 100
  ) {
    throw new TypeError(
      "Emri i burimit duhet të jetë tekst me 1 deri në 100 karaktere."
    );
  }

  const resolvedSourceName = sourceName.trim();

  const provider = createKnowledgeDatasetSearchProvider({
    registry
  });

  const unregister = registerKnowledgeSource(
    resolvedSourceName,
    async (query, options = {}) => {
      const normalizedOptions = normalizeSearchOptions(options);

      if (!normalizedOptions) {
        return createFailureResult(
          "Opsionet e kërkimit janë të pavlefshme."
        );
      }

      try {
        const result = await provider.searchKnowledgeDataset(
          query,
          normalizedOptions
        );

        return normalizeProviderResult(
          result,
          resolvedSourceName
        );
      } catch (error) {
        return createFailureResult(
          error instanceof Error && error.message.trim()
            ? error.message
            : DEFAULT_ERROR_MESSAGE
        );
      }
    }
  );

  return Object.freeze({
    success: true,
    source: resolvedSourceName,
    unregister
  });
}
