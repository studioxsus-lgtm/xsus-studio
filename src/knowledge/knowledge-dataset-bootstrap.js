
/**
 * XSUS AI Core — Knowledge Dataset Bootstrap
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * 1. Krijon registry-n e dataset-eve.
 * 2. Inicializon storage real ose adapter të injektuar për testim.
 * 3. Krijon sistemin e persistence.
 * 4. Rikthen dataset-et e ruajtura.
 * 5. Regjistron integrimin me knowledge-service.
 * 6. Mundëson mbylljen e sigurt të integrimit.
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
const ENGINE_VERSION = "1.1.0";

function validateStorageAdapter(storageAdapter) {
  if (
    !storageAdapter ||
    typeof storageAdapter.saveDatasets !== "function" ||
    typeof storageAdapter.loadDatasets !== "function"
  ) {
    throw new TypeError(
      "storageAdapter duhet të ofrojë metodat saveDatasets dhe loadDatasets."
    );
  }

  return storageAdapter;
}

export async function initializeKnowledgeDatasets({
  filePath,
  storageAdapter
} = {}) {
  if (
    !storageAdapter &&
    (typeof filePath !== "string" || !filePath.trim())
  ) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  const registry = createKnowledgeDatasetRegistry();

  const storage = storageAdapter
    ? validateStorageAdapter(storageAdapter)
    : createKnowledgeDatasetStorage({ filePath });

  const persistence = createKnowledgeDatasetPersistence({
    registry,
    storage
  });

  // Rikthen dataset-et përpara regjistrimit të burimit të kërkimit.
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
        version: ENGINE_VERSION,
        storageMode: storageAdapter ? "adapter" : "file"
      });
    }
  });
}
