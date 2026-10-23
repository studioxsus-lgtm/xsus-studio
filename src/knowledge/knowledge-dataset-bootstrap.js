
/**
 * XSUS AI Core — Knowledge Dataset Bootstrap
 * Version: 1.0.0
 *
 * Inicializon sistemin e dataset-eve:
 * 1. Krijon registry-n.
 * 2. Krijon storage dhe persistence.
 * 3. Rikthen dataset-et e ruajtura.
 * 4. Regjistron integrimin me knowledge-service.
 */

import {
  createKnowledgeDatasetRegistry
} from "./knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetStorage
} from "./knowledge-dataset-storage.js";

import {
  createKnowledgeDatasetPersistence
} from "./knowledge-dataset-persistence.js";

import {
  registerKnowledgeDatasetIntegration
} from "./knowledge-dataset-integration.js";

const ENGINE_NAME = "xsus-knowledge-dataset-bootstrap";
const ENGINE_VERSION = "1.0.0";

export async function initializeKnowledgeDatasets({
  filePath
} = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  const registry = createKnowledgeDatasetRegistry();

  const storage = createKnowledgeDatasetStorage({
    filePath
  });

  const persistence = createKnowledgeDatasetPersistence({
    registry,
    storage
  });

  // Rikthen dataset-et para se të regjistrohet burimi i kërkimit.
  const restoration = await persistence.restoreRegistry();

  if (restoration?.success === false) {
    throw new Error(
      "Rikthimi i dataset-eve të XSUS AI dështoi."
    );
  }

  const integration = registerKnowledgeDatasetIntegration({
    registry
  });

  let closed = false;

  return Object.freeze({
    success: true,
    registry,
    storage,
    persistence,
    integration,
    restoration,

    async save() {
      if (closed) {
        throw new Error(
          "Inicializuesi i dataset-eve është mbyllur."
        );
      }

      return persistence.saveRegistry();
    },

    close() {
      if (closed) {
        return false;
      }

      closed = true;
      integration.unregister();

      return true;
    },

    getMetadata() {
      return Object.freeze({
        engine: ENGINE_NAME,
        version: ENGINE_VERSION
      });
    }
  });
}
