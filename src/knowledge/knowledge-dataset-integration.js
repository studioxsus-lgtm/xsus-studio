
/**
 * XSUS AI Core — Knowledge Dataset Integration
 * Version: 1.0.2
 *
 * Përgjegjësitë:
 * - Lidh dataset-et me Knowledge Service.
 * - Kontrollon regjistrin para regjistrimit.
 * - Kthen rezultatet në format të standardizuar.
 * - Lejon çregjistrimin e sigurt të burimit.
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
  if (
    !registry ||
    typeof registry.listDatasets !== "function" ||
    typeof registry.getDataset !== "function"
  ) {
    throw new TypeError(
      "Registry duhet të ofrojë listDatasets() dhe getDataset()."
    );
  }

  const provider = createKnowledgeDatasetSearchProvider({
    registry
  });

  const search = async (query, options = {}) => {
    try {
      const result = await provider.searchKnowledgeDataset(
        query,
        {
          language: options.language,
          domain: options.domain,
          limit: options.limit
        }
      );

      if (!result || result.success !== true) {
        return {
          success: false,
          results: [],
          error:
            result?.error ||
            "Kërkimi në dataset dështoi.",
          metadata: result?.metadata || {}
        };
      }

      return {
        success: true,
        results: Array.isArray(result.results)
          ? result.results
          : [],
        metadata: result.metadata || {}
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error:
          error instanceof Error
            ? error.message
            : "Gabim i panjohur gjatë kërkimit në dataset.",
        metadata: {}
      };
    }
  };

  const unregister = registerKnowledgeSource(
    SOURCE_NAME,
    search
  );

  let active = true;

  return Object.freeze({
    success: true,
    source: SOURCE_NAME,

    unregister() {
      if (!active) {
        return false;
      }

      active = false;
      return unregister();
    }
  });
}
