
/**
 * XSUS AI Core — Knowledge Dataset Integration
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i kërkimit në dataset si burim njohurish.
 * - Normalizimi i rezultateve.
 * - Izolimi i gabimeve të provider-it.
 * - Ruajtja e kontratës së knowledge-service.js.
 * - Mundësimi i çregjistrimit të burimit.
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
    error: typeof error === "string" && error.trim()
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

function normalizeProviderResult(result) {
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

  const results = result.results.filter((entry) => (
    entry !== null &&
    typeof entry === "object" &&
    !Array.isArray(entry)
  )).map((entry) => ({
    ...entry,
    source: SOURCE_NAME
  }));

  return {
    success: true,
    results,
    metadata: result.metadata ?? null
  };
}

/**
 * Regjistron burimin e dataset-eve në knowledge-service.
 *
 * @param {object} options
 * @param {object} options.registry
 * @returns {{success: boolean, source: string, unregister: Function}}
 */
export function registerKnowledgeDatasetIntegration({
  registry
} = {}) {
  const provider = createKnowledgeDatasetSearchProvider({
    registry
  });

  const unregister = registerKnowledgeSource(
    SOURCE_NAME,
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

        return normalizeProviderResult(result);
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
    source: SOURCE_NAME,
    unregister
  });
}
