
/**
 * XSUS AI Core — Knowledge Dataset Integration
 * Version: 1.0.0
 *
 * Lidh dataset-et e regjistruara me knowledge-service.js.
 * Nuk zëvendëson kërkimin ekzistues dhe nuk ndryshon registry-n.
 */

import {
  registerKnowledgeSource
} from "./knowledge-service.js";

import {
  createKnowledgeDatasetSearchProvider
} from "./knowledge-dataset-search-adapter.js";

const SOURCE_NAME = "xsus-knowledge-datasets";

/**
 * Regjistron dataset-et si burim shtesë njohurish.
 *
 * @param {object} options
 * @param {object} options.registry Registry i dataset-eve.
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
      const result = provider.searchKnowledgeDataset(query, {
        language: options.language,
        domain: options.domain,
        limit: options.limit
      });

      if (!result.success) {
        throw new Error(
          result.error || "Kërkimi në dataset dështoi."
        );
      }

      return {
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
