/**
 * XSUS AI Core — Knowledge Dataset Pipeline
 * Version: 1.3.0
 *
 * Përmirësime:
 * - Serializimi i operacioneve që ndryshojnë gjendjen.
 * - Rikthimi i dataset-eve kur ruajtja dështon.
 * - Gjurmimi i konsistencës së persistencës.
 * - Raportimi i dështimeve të rikuperimit.
 * - Metadata të sakta edhe për përgjigjet e gabimit.
 * - Mbështetje për storageAdapter të injektuar për testim.
 * - Mbyllje pas përfundimit të operacioneve të pranuara.
 * - Mbyllje e njëkohshme me një Promise të përbashkët.
 * - Mbështetje për sourceName të personalizuar.
 * - Ruajtja e API-së publike ekzistuese.
 */

import {
  initializeKnowledgeDatasets
} from "./knowledge-dataset-bootstrap.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "./knowledge-dataset-search-adapter.js";

const ENGINE_NAME = "xsus-knowledge-dataset-pipeline";
const ENGINE_VERSION = "1.3.0";

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

function createError(message, extra = {}) {
  const {
    metadata: extraMetadata,
    ...fields
  } = extra;

  return {
    success: false,
    error: message,
    ...fields,
    metadata: createSuccessMetadata(
      isPlainObject(extraMetadata)
        ? extraMetadata
        : {}
    )
  };
}

export async function createKnowledgeDatasetPipeline({
  filePath,
  storageAdapter,
  sourceName
} = {}) {
  if (
    typeof filePath !== "string" ||
    !filePath.trim()
  ) {
    throw new TypeError(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  }

  const bootstrapOptions = {
    filePath: filePath.trim()
  };

  if (storageAdapter !== undefined) {
    bootstrapOptions.storageAdapter = storageAdapter;
  }

  if (sourceName !== undefined) {
    bootstrapOptions.sourceName = sourceName;
  }

  const bootstrap = await initializeKnowledgeDatasets(
    bootstrapOptions
  );

  const registry = bootstrap.registry;

  let searchAdapter;

  try {
    searchAdapter = createKnowledgeDatasetSearchAdapter({
      registry
    });
  } catch (error) {
    try {
      await bootstrap.close();
    } catch {
      // Ruajmë gabimin fillestar të inicializimit.
    }

    throw error;
  }

  let closed = false;
  let closing = false;
  let closePromise = null;

  let operationQueue = Promise.resolve();

  let persistenceConsistent = true;
  let lastPersistenceError = null;

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

    // Dështimi i një operacioni nuk bllokon radhën.
    operationQueue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  async function saveInternal() {
    let result;

    try {
      result = await bootstrap.save();
    } catch (error) {
      persistenceConsistent = false;

      lastPersistenceError = getErrorMessage(
        error,
        "Ruajtja e dataset-eve dështoi."
      );

      throw error;
    }

    if (result?.success !== true) {
      const error = new Error(
        result?.error ||
        "Ruajtja e dataset-eve dështoi."
      );

      persistenceConsistent = false;
      lastPersistenceError = error.message;

      throw error;
    }

    persistenceConsistent = true;
    lastPersistenceError = null;

    return result;
  }

  async function persistRollback() {
    try {
      await saveInternal();

      return {
        rollbackSucceeded: true,
        rollbackError: null
      };
    } catch (error) {
      persistenceConsistent = false;

      lastPersistenceError = getErrorMessage(
        error,
        "Rikthimi i storage-it dështoi."
      );

      return {
        rollbackSucceeded: false,
        rollbackError: lastPersistenceError
      };
    }
  }

  async function registerDataset(datasetId, entries) {
    try {
      return await enqueueOperation(async () => {
        const registration = registry.registerDataset(
          datasetId,
          entries
        );

        if (!registration.success) {
          return {
            ...registration,
            metadata: createSuccessMetadata({
              persisted: false,
              persistenceConsistent,
              lastPersistenceError
            })
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: registration.datasetId,
            dataset: registration.dataset,
            metadata: createSuccessMetadata({
              persisted: true,
              persistenceConsistent: true,
              lastPersistenceError: null
            })
          };
        } catch (error) {
          const originalError = getErrorMessage(
            error,
            "Regjistrimi i dataset-it dështoi."
          );

          let rollbackSucceeded = false;
          let rollbackError = null;

          try {
            const rollback = registry.removeDataset(
              registration.datasetId
            );

            if (!rollback.success) {
              throw new Error(
                rollback.error ||
                "Dataset-i nuk mund të hiqej gjatë rikuperimit."
              );
            }

            const persistenceRollback =
              await persistRollback();

            rollbackSucceeded =
              persistenceRollback.rollbackSucceeded;

            rollbackError =
              persistenceRollback.rollbackError;
          } catch (rollbackFailure) {
            persistenceConsistent = false;

            rollbackError = getErrorMessage(
              rollbackFailure,
              "Rikthimi i storage-it dështoi."
            );

            lastPersistenceError = rollbackError;
          }

          return createError(originalError, {
            datasetId: registration.datasetId,
            rollbackSucceeded,
            rollbackError,
            metadata: {
              persisted: rollbackSucceeded,
              persistenceConsistent,
              lastPersistenceError
            }
          });
        }
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          "Regjistrimi i dataset-it dështoi."
        ),
        {
          datasetId: null,
          metadata: {
            persistenceConsistent,
            lastPersistenceError
          }
        }
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
              removed: false,
              metadata: {
                persistenceConsistent,
                lastPersistenceError
              }
            }
          );
        }

        const removal = registry.removeDataset(datasetId);

        if (!removal.success) {
          return {
            ...removal,
            metadata: createSuccessMetadata({
              persistenceConsistent,
              lastPersistenceError
            })
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: removal.datasetId,
            removed: true,
            metadata: createSuccessMetadata({
              persisted: true,
              persistenceConsistent: true,
              lastPersistenceError: null
            })
          };
        } catch (error) {
          const originalError = getErrorMessage(
            error,
            "Heqja e dataset-it nuk mund të ruhej."
          );

          let rollbackSucceeded = false;
          let rollbackError = null;

          try {
            const restoration = registry.registerDataset(
              existingDataset.id,
              existingDataset.collection
            );

            if (!restoration.success) {
              throw new Error(
                restoration.error ||
                "Rikthimi i dataset-it në memorie dështoi."
              );
            }

            const rollback = await persistRollback();

            rollbackSucceeded = rollback.rollbackSucceeded;
            rollbackError = rollback.rollbackError;
          } catch (rollbackFailure) {
            persistenceConsistent = false;

            rollbackError = getErrorMessage(
              rollbackFailure,
              "Rikthimi i dataset-it në memorie dështoi."
            );

            lastPersistenceError = rollbackError;
          }

          return createError(originalError, {
            datasetId: removal.datasetId,
            removed: false,
            rollbackSucceeded,
            rollbackError,
            metadata: {
              persisted: rollbackSucceeded,
              persistenceConsistent,
              lastPersistenceError
            }
          });
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
          removed: false,
          metadata: {
            persistenceConsistent,
            lastPersistenceError
          }
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
          metadata: createSuccessMetadata({
            ...(isPlainObject(result?.metadata)
              ? result.metadata
              : {}),
            persisted: true,
            persistenceConsistent: true,
            lastPersistenceError: null
          })
        };
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          "Ruajtja e dataset-eve dështoi."
        ),
        {
          metadata: {
            persisted: false,
            persistenceConsistent,
            lastPersistenceError
          }
        }
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
      persistenceConsistent,
      lastPersistenceError,
      closed
    });
  }

  function close() {
    // Pas përfundimit të mbylljes, thirrjet e tjera kthejnë false.
    if (closed) {
      return Promise.resolve(false);
    }

    // Thirrjet që mbërrijnë gjatë të njëjtit proces
    // mbylljeje presin të njëjtën Promise.
    if (closePromise) {
      return closePromise;
    }

    closing = true;

    closePromise = (async () => {
      // Operacionet e pranuara më parë përfundojnë të parat.
      await operationQueue;

      // bootstrap.close mund të jetë sinkron ose asinkron.
      await bootstrap.close();

      closed = true;
      closing = false;

      return true;
    })();

    return closePromise;
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
