/**
 * XSUS AI Core — Knowledge Dataset Bootstrap
 * Version: 1.1.0
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
 * 9. Mbështet emrin e personalizuar të burimit.
 * 10. Ruajtja e gabimit origjinal gjatë pastrimit.
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

/**
 * Kontrollon adapter-in e storage.
 */
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

/**
 * Përgatit informacionin diagnostikues pa lejuar
 * që një objekt i pakonvertueshëm të shkaktojë gabim tjetër.
 */
function getErrorDetails(value) {
  if (typeof value?.error === "string") {
    return value.error;
  }

  try {
    const serialized = JSON.stringify(value);

    return serialized ?? "Nuk u kthye rezultat i vlefshëm.";
  } catch {
    return "Rezultati nuk mund të serializohet.";
  }
}

/**
 * Kontrollon rezultatin e rikthimit të dataset-eve.
 */
function validateRestorationResult(restoration) {
  if (
    restoration === null ||
    restoration === undefined ||
    restoration.success !== true
  ) {
    const details = getErrorDetails(restoration);

    throw new Error(
      `Rikthimi i dataset-eve të XSUS AI dështoi. Detajet: ${details}`
    );
  }

  return restoration;
}

/**
 * Mbyll integrimin duke ruajtur përparësinë
 * e metodës close ndaj metodës unregister.
 */
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

/**
 * Pastron integrimin pas dështimit të inicializimit.
 *
 * Gabimi gjatë pastrimit nuk duhet të fshehë
 * gabimin origjinal që shkaktoi dështimin.
 */
function safelyCloseIntegration(integration) {
  try {
    return closeIntegration(integration);
  } catch {
    return false;
  }
}

/**
 * Inicializon sistemin e dataset-eve të XSUS AI.
 *
 * @param {Object} options
 * @param {string} options.filePath
 * @param {Object} options.storageAdapter
 * @param {string} options.sourceName
 *
 * @returns {Promise<Object>}
 */
export async function initializeKnowledgeDatasets({
  filePath,
  storageAdapter,
  sourceName
} = {}) {
  const hasStorageAdapter = storageAdapter !== undefined;

  // Validimi i konfigurimit të storage.
  if (
    !hasStorageAdapter &&
    (
      typeof filePath !== "string" ||
      !filePath.trim()
    )
  ) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  if (hasStorageAdapter) {
    validateStorageAdapter(storageAdapter);
  }

  // Krijimi i komponentëve bazë.
  const registry = createKnowledgeDatasetRegistry();

  const storage = hasStorageAdapter
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
    // 1. Rikthe dataset-et përpara regjistrimit të integrimit.
    const restoration = validateRestorationResult(
      await persistence.restoreRegistry()
    );

    // 2. Përgatit opsionet e integrimit.
    const integrationOptions = {
      registry
    };

    // Ruaj sjelljen standarde kur sourceName nuk jepet.
    if (sourceName !== undefined) {
      integrationOptions.sourceName = sourceName;
    }

    // 3. Regjistro integrimin me Knowledge Service.
    integration = registerKnowledgeDatasetIntegration(
      integrationOptions
    );

    if (!integration || integration.success !== true) {
      throw new Error(
        integration?.error ||
        "Regjistrimi i integrimit të knowledge datasets dështoi."
      );
    }

    /**
     * Kontrollon nëse inicializuesi është ende aktiv.
     */
    function assertOpen() {
      if (closed) {
        throw new Error(
          "Inicializuesi i dataset-eve është mbyllur."
        );
      }
    }

    /**
     * Mbyll inicializuesin vetëm një herë.
     *
     * Nëse integrimi dështon gjatë mbylljes,
     * gjendja closed mbetet aktive për të parandaluar
     * përdorimin e mëtejshëm të inicializuesit.
     */
    function close() {
      if (closed) {
        return false;
      }

      closed = true;

      return closeIntegration(integration);
    }

    // 4. Kthe objektin publik me API-në ekzistuese.
    return Object.freeze({
      success: true,

      registry,
      storage,
      persistence,
      integration,
      restoration,

      /**
       * Ruajtja e dataset-eve.
       */
      async save() {
        assertOpen();

        return persistence.saveRegistry();
      },

      /**
       * Mbyllja e integrimit.
       */
      close,

      /**
       * Metadata e inicializuesit.
       */
      getMetadata() {
        return Object.freeze({
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          storageMode: hasStorageAdapter
            ? "adapter"
            : "file"
        });
      }
    });
  } catch (error) {
    // Pastrimi nuk duhet të fshehë gabimin origjinal.
    safelyCloseIntegration(integration);

    throw error;
  }
}

export default initializeKnowledgeDatasets;
