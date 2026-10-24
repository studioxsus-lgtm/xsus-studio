
/**
 * XSUS AI Core — Knowledge Dataset Bootstrap
 * Version: 1.1.2
 *
 * Përgjegjësitë:
 * 1. Krijon registry-n e dataset-eve.
 * 2. Inicializon storage real ose adapter të injektuar.
 * 3. Krijon sistemin e persistence.
 * 4. Rikthen dataset-et e ruajtura.
 * 5. Regjistron integrimin me Knowledge Service.
 * 6. Mundëson mbylljen e sigurt të integrimit.
 * 7. Pastron burimet nëse inicializimi dështon.
 * 8. Ruajtja e përputhshmërisë me API-në publike.
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
const ENGINE_VERSION = "1.1.2";

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

function validateRestorationResult(restoration) {
  if (
    restoration === null ||
    restoration === undefined ||
    restoration.success === false
  ) {
    throw new Error(
      "Rikthimi i dataset-eve të XSUS AI dështoi."
    );
  }

  return restoration;
}

function closeIntegration(integration) {
  if (!integration) {
    return false;
  }

  if (typeof integration.close === "function") {
    return integration.close();
  }

  if (typeof integration.unregister === "function") {
    return integration.unregister();
  }

  return false;
}

export async function initializeKnowledgeDatasets({
  filePath,
  storageAdapter
} = {}) {
  if (
    !storageAdapter &&
    (
      typeof filePath !== "string" ||
      !filePath.trim()
    )
  ) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  if (storageAdapter !== undefined) {
    validateStorageAdapter(storageAdapter);
  }

  const registry = createKnowledgeDatasetRegistry();

  const storage = storageAdapter
    ? storageAdapter
    : createKnowledgeDatasetStorage({
        filePath: filePath.trim()
      });

  const persistence = createKnowledgeDatasetPersistence({
    registry,
    storage
  });

  let integration = null;
  let closed = false;

  try {
    // Rikthen të dhënat para regjistrimit të integrimit.
    const restoration = validateRestorationResult(
      await persistence.restoreRegistry()
    );

    integration = registerKnowledgeDatasetIntegration({
      registry
    });

    if (!integration || integration.success !== true) {
      throw new Error(
        integration?.error ||
        "Regjistrimi i integrimit të knowledge datasets dështoi."
      );
    }

    function assertOpen() {
      if (closed) {
        throw new Error(
          "Inicializuesi i dataset-eve është mbyllur."
        );
      }
    }

    function close() {
      if (closed) {
        return false;
      }

      closed = true;
      closeIntegration(integration);

      return true;
    }

    return Object.freeze({
      success: true,
      registry,
      storage,
      persistence,
      integration,
      restoration,

      async save() {
        assertOpen();
        return persistence.saveRegistry();
      },

      close,

      getMetadata() {
        return Object.freeze({
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          storageMode: storageAdapter ? "adapter" : "file"
        });
      }
    });
  } catch (error) {
    // Nëse inicializimi dështon, mos lër burim aktiv.
    closeIntegration(integration);
    throw error;
  }
}

export default initializeKnowledgeDatasets;
