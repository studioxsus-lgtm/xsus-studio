
/**
 * XSUS AI Core — Knowledge Dataset Pipeline
 * Version: 1.1.0
 *
 * Përmirësime:
 * - Serializimi i operacioneve që ndryshojnë gjendjen.
 * - Ruajtja e rendit të regjistrimeve, heqjeve dhe save().
 * - Rikthimi i gjendjes në memorie kur ruajtja dështon.
 * - Mbyllja pas përfundimit të operacioneve në pritje.
 * - Ruajtja e API-së publike ekzistuese.
 */

import {
  initializeKnowledgeDatasets
} from "./knowledge-dataset-bootstrap.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "./knowledge-dataset-search-adapter.js";

const ENGINE_NAME = "xsus-knowledge-dataset-pipeline";
const ENGINE_VERSION = "1.1.0";

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

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function createSuccessMetadata(extra = {}) {
  return {
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    ...extra
  };
}

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

  let searchAdapter;

  try {
    searchAdapter = createKnowledgeDatasetSearchAdapter({
      registry
    });
  } catch (error) {
    bootstrap.close();

    throw error;
  }

  let closed = false;
  let closing = false;

  // Radha e përbashkët për operacionet që ndryshojnë gjendjen.
  let operationQueue = Promise.resolve();

  function assertOpen() {
    if (closed || closing) {
      throw new Error(
        "Knowledge Dataset Pipeline është mbyllur ose po mbyllet."
      );
    }
  }

  function enqueueOperation(operation) {
    assertOpen();

    const task = operationQueue.then(async () => {
      if (closed) {
        throw new Error(
          "Knowledge Dataset Pipeline është mbyllur."
        );
      }

      return operation();
    });

    // Një dështim nuk duhet të bllokojë operacionet pasuese.
    operationQueue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  async function saveInternal() {
    const result = await bootstrap.save();

    if (result?.success === false) {
      throw new Error(
        result.error || "Ruajtja e dataset-eve dështoi."
      );
    }

    return result;
  }

  function registerInMemory(datasetId, entries) {
    const result = registry.registerDataset(
      datasetId,
      entries
    );

    if (!result.success) {
      return result;
    }

    return result;
  }

  async function registerDataset(datasetId, entries) {
    try {
      return await enqueueOperation(async () => {
        const registration = registerInMemory(
          datasetId,
          entries
        );

        if (!registration.success) {
          return {
            ...registration,
            metadata: createSuccessMetadata()
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: registration.datasetId,
            dataset: registration.dataset,
            metadata: createSuccessMetadata({
              persisted: true
            })
          };
        } catch (error) {
          // Heq vetëm dataset-in e saporegjistruar.
          registry.removeDataset(registration.datasetId);

          let rollbackSucceeded = true;
          let rollbackError = null;

          try {
            // Rikthen skedarin në gjendjen pa dataset-in e ri.
            await saveInternal();
          } catch (rollbackFailure) {
            rollbackSucceeded = false;
            rollbackError = getErrorMessage(
              rollbackFailure,
              "Rikthimi i storage-it dështoi."
            );
          }

          return createError(
            getErrorMessage(
              error,
              "Regjistrimi i dataset-it dështoi."
            ),
            {
              datasetId: registration.datasetId,
              rollbackSucceeded,
              rollbackError
            }
          );
        }
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          "Regjistrimi i dataset-it dështoi."
        ),
        { datasetId: null }
      );
    }
  }

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

  function getDataset(datasetId) {
    assertOpen();
    return registry.getDataset(datasetId);
  }

  function listDatasets() {
    assertOpen();
    return registry.listDatasets();
  }

  async function removeDataset(datasetId) {
    try {
      return await enqueueOperation(async () => {
        const existingDataset = registry.getDataset(
          datasetId
        );

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
            metadata: createSuccessMetadata()
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: removal.datasetId,
            removed: true,
            metadata: createSuccessMetadata({
              persisted: true
            })
          };
        } catch (error) {
          // Rikrijon dataset-in në memorie nëse shkrimi dështon.
          const restoration = registry.registerDataset(
            existingDataset.id,
            existingDataset.collection
          );

          let rollbackSucceeded = restoration.success;
          let rollbackError = restoration.success
            ? null
            : restoration.error ||
              "Rikthimi i dataset-it në memorie dështoi.";

          // Përpiqet të rivendosë edhe snapshot-in në disk.
          try {
            await saveInternal();
          } catch (rollbackFailure) {
            rollbackSucceeded = false;
            rollbackError = getErrorMessage(
              rollbackFailure,
              "Rikthimi i storage-it dështoi."
            );
          }

          return createError(
            getErrorMessage(
              error,
              "Heqja e dataset-it nuk mund të ruhej."
            ),
            {
              datasetId: removal.datasetId,
              removed: false,
              rollbackSucceeded,
              rollbackError
            }
          );
        }
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          "Heqja e dataset-it dështoi."
        ),
        {
          datasetId,
          removed: false
        }
      );
    }
  }

  async function save() {
    try {
      return await enqueueOperation(async () => {
        const result = await saveInternal();

        return {
          ...(isPlainObject(result) ? result : {}),
          success: true,
          metadata: createSuccessMetadata(
            isPlainObject(result?.metadata)
              ? result.metadata
              : {}
          )
        };
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          "Ruajtja e dataset-eve dështoi."
        )
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
      serializedOperations: true,
      closed
    });
  }

  async function close() {
    if (closed || closing) {
      return false;
    }

    closing = true;

    // Prit operacionet e pranuara përpara mbylljes.
    await operationQueue;

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
