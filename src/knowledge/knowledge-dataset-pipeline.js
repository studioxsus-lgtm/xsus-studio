
/**
 * XSUS AI Core — Knowledge Dataset Pipeline
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Orkestrimi i regjistrimit dhe validimit të dataset-eve.
 * - Kërkimi në dataset-et e regjistruara.
 * - Ruajtja dhe rikthimi i dataset-eve.
 * - Kontrolli i ciklit të jetës së pipeline-it.
 * - Metadata të standardizuara.
 *
 * Përdor modulet ekzistuese pa ndryshuar API-të e tyre.
 */

import {
  initializeKnowledgeDatasets
} from "./knowledge-dataset-bootstrap.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "./knowledge-dataset-search-adapter.js";

const ENGINE_NAME = "xsus-knowledge-dataset-pipeline";
const ENGINE_VERSION = "1.0.0";

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

function createError(message, extra = {}) {
  return {
    success: false,
    error: message,
    ...extra,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION
    }
  };
}

/**
 * Krijon dhe inicializon pipeline-in e dataset-eve.
 *
 * filePath është i detyrueshëm dhe përcakton
 * skedarin JSON që përdoret nga storage ekzistues.
 */
export async function createKnowledgeDatasetPipeline({
  filePath
} = {}) {
  if (
    typeof filePath !== "string" ||
    !filePath.trim()
  ) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  const bootstrap = await initializeKnowledgeDatasets({
    filePath: filePath.trim()
  });

  const registry = bootstrap.registry;

  const searchAdapter = createKnowledgeDatasetSearchAdapter({
    registry
  });

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "Knowledge Dataset Pipeline është mbyllur."
      );
    }
  }

  /**
   * Regjistron dataset dhe e ruan gjendjen në JSON.
   * Nëse ruajtja dështon, përpiqet të rikthejë
   * regjistrin në gjendjen e mëparshme.
   */
  async function registerDataset(datasetId, entries) {
    assertOpen();

    const registration = registry.registerDataset(
      datasetId,
      entries
    );

    if (!registration.success) {
      return {
        ...registration,
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION
        }
      };
    }

    try {
      const saveResult = await bootstrap.save();

      if (saveResult?.success === false) {
        throw new Error(
          saveResult.error ||
            "Ruajtja e dataset-it dështoi."
        );
      }

      return {
        success: true,
        datasetId: registration.datasetId,
        dataset: registration.dataset,
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          persisted: true
        }
      };
    } catch (error) {
      registry.removeDataset(registration.datasetId);

      let rollbackError = null;

      try {
        const rollbackResult = await bootstrap.save();

        if (rollbackResult?.success === false) {
          rollbackError =
            rollbackResult.error ||
            "Ruajtja e gjendjes së rikthyer dështoi.";
        }
      } catch (rollbackFailure) {
        rollbackError =
          rollbackFailure instanceof Error
            ? rollbackFailure.message
            : "Rikthimi pas dështimit të ruajtjes dështoi.";
      }

      return createError(
        error instanceof Error
          ? error.message
          : "Regjistrimi i dataset-it dështoi.",
        {
          datasetId: registration.datasetId,
          rollbackSucceeded: rollbackError === null,
          rollbackError
        }
      );
    }
  }

  /**
   * Kërkon vetëm në dataset-et e këtij pipeline-i.
   */
  function search(query, options = {}) {
    assertOpen();

    if (!isPlainObject(options)) {
      return createError(
        "Opsionet e kërkimit janë të pavlefshme.",
        { results: [] }
      );
    }

    return searchAdapter.search(query, options);
  }

  /**
   * Kthen një dataset sipas ID-së.
   */
  function getDataset(datasetId) {
    assertOpen();
    return registry.getDataset(datasetId);
  }

  /**
   * Kthen përmbledhjen e dataset-eve të regjistruara.
   */
  function listDatasets() {
    assertOpen();
    return registry.listDatasets();
  }

  /**
   * Heq dataset dhe ruan ndryshimin.
   */
  async function removeDataset(datasetId) {
    assertOpen();

    const existingDataset = registry.getDataset(datasetId);

    if (!existingDataset) {
      return createError(
        "Dataset-i nuk u gjet.",
        {
          datasetId,
          removed: false
        }
      );
    }

    const removal = registry.removeDataset(datasetId);

    if (!removal.success) {
      return {
        ...removal,
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION
        }
      };
    }

    try {
      const saveResult = await bootstrap.save();

      if (saveResult?.success === false) {
        throw new Error(
          saveResult.error ||
            "Ruajtja pas heqjes së dataset-it dështoi."
        );
      }

      return {
        success: true,
        datasetId: removal.datasetId,
        removed: true,
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          persisted: true
        }
      };
    } catch (error) {
      // Rivendos dataset-in në regjistër nëse ruajtja dështon.
      const restoration = registry.registerDataset(
        existingDataset.id,
        existingDataset.collection
      );

      return createError(
        error instanceof Error
          ? error.message
          : "Heqja e dataset-it nuk mund të ruhej.",
        {
          datasetId: removal.datasetId,
          removed: false,
          rollbackSucceeded: restoration.success
        }
      );
    }
  }

  /**
   * Ruajtje e qartë e gjendjes aktuale.
   */
  async function save() {
    assertOpen();

    try {
      const result = await bootstrap.save();

      return {
        ...result,
        metadata: {
          engine: ENGINE_NAME,
          version: ENGINE_VERSION,
          ...(isPlainObject(result?.metadata)
            ? result.metadata
            : {})
        }
      };
    } catch (error) {
      return createError(
        error instanceof Error
          ? error.message
          : "Ruajtja e dataset-eve dështoi."
      );
    }
  }

  function getMetadata() {
    return Object.freeze({
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      datasetCount: registry.listDatasets().length,
      searchEngine: searchAdapter.getMetadata().engine,
      storageEnabled: true,
      persistenceEnabled: true,
      closed
    });
  }

  /**
   * Mbyll pipeline-in dhe çregjistron integrimin
   * e krijuar nga bootstrap-i.
   */
  function close() {
    if (closed) {
      return false;
    }

    closed = true;
    bootstrap.close();

    return true;
  }

  return Object.freeze({
    success: true,
    registerDataset,
    search,
    getDataset,
    listDatasets,
    removeDataset,
    save,
    getMetadata,
    close
  });
}

export default createKnowledgeDatasetPipeline;
