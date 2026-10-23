
/**
 * XSUS AI Core — Knowledge Dataset Integration
 * Version: 1.0.1
 */

import {
  registerKnowledgeSource
} from "./knowledge-service.js";

import {
  createKnowledgeDatasetSearchProvider
} from "./knowledge-dataset-search-adapter.js";

const SOURCE_NAME = "xsus-knowledge-datasets";

export function registerKnowledgeDatasetIntegration({
  registry
} = {}) {
  const provider = createKnowledgeDatasetSearchProvider({
    registry
  });

  const unregister = registerKnowledgeSource(
    SOURCE_NAME,
    async (query, options = {}) => {
      const result = provider.searchKnowledgeDataset(query, {
        language: options.language,
        domain: options.domain,
        limit: options.limit
      });

      if (!result.success) {
        return {
          success: false,
          results: [],
          error: result.error || "Kërkimi në dataset dështoi.",
          metadata: result.metadata
        };
      }

      return {
        success: true,
        results: result.results,
        metadata: result.metadata
      };
    }
  );

  return Object.freeze({
    success: true,
    source: SOURCE_NAME,
    unregister
  });
}
