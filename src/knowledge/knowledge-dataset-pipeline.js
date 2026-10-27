/**
 * XSUS AI Core — Knowledge Dataset Pipeline
 * Version: 1.4.0
 *
 * Përmirësime:
 * - Serializim i operacioneve që ndryshojnë gjendjen.
 * - Rikthim i dataset-eve pas dështimit të persistencës.
 * - Gjurmim i konsistencës së persistencës.
 * - Raportim i gabimeve të rikuperimit.
 * - Metadata të standardizuara.
 * - Mbështetje për storageAdapter dhe sourceName.
 * - Mbyllje e sigurt me një Promise të përbashkët.
 * - Përfundim i operacioneve të pranuara para mbylljes.
 * - Ruajtje e API-së publike ekzistuese.
 */

import {
  initializeKnowledgeDatasets
} from "./knowledge-dataset-bootstrap.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "./knowledge-dataset-search-adapter.js";

const ENGINE_NAME = "xsus-knowledge-dataset-pipeline";
const ENGINE_VERSION = "1.4.0";

const ERROR_MESSAGES = Object.freeze({
  INVALID_FILE_PATH:
    "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve.",
  CLOSED:
    "Knowledge Dataset Pipeline është mbyllur ose po mbyllet.",
  CLOSED_OPERATION:
    "Knowledge Dataset Pipeline është mbyllur.",
  SAVE_FAILED:
    "Ruajtja e dataset-eve dështoi.",
  ROLLBACK_FAILED:
    "Rikthimi i storage-it dështoi.",
  REGISTER_FAILED:
    "Regjistrimi i dataset-it dështoi.",
  REMOVE_FAILED:
    "Heqja e dataset-it dështoi.",
  RESTORE_FAILED:
    "Rikthimi i dataset-it në memorie dështoi.",
  DATASET_NOT_FOUND:
    "Dataset-i nuk u gjet.",
  INVALID_SEARCH_OPTIONS:
    "Opsionet e kërkimit janë të pavlefshme."
});

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
  return (
    error instanceof Error && error.message
      ? error.message
      : fallback
  );
}

function createMetadata(extra = {}) {
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
    metadata: createMetadata(
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
    throw new TypeError(ERROR_MESSAGES.INVALID_FILE_PATH);
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

  if (
    !bootstrap ||
    !bootstrap.registry ||
    typeof bootstrap.save !== "function" ||
    typeof bootstrap.close !== "function"
  ) {
    try {
      bootstrap?.close?.();
    } catch {
      // Ruajmë gabimin fillestar të inicializimit.
    }

    throw new Error(
      "Inicializimi i Knowledge Dataset Pipeline dështoi."
    );
  }

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
      // Ruajmë gabimin fillestar.
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
      throw new Error(ERROR_MESSAGES.CLOSED);
    }
  }

  function enqueueOperation(operation) {
    assertOpen();

    const task = operationQueue.then(async () => {
      if (closed) {
        throw new Error(ERROR_MESSAGES.CLOSED_OPERATION);
      }

      return operation();
    });

    // Një dështim nuk e bllokon radhën.
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
        ERROR_MESSAGES.SAVE_FAILED
      );

      throw error;
    }

    if (result?.success !== true) {
      const error = new Error(
        result?.error || ERROR_MESSAGES.SAVE_FAILED
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
        ERROR_MESSAGES.ROLLBACK_FAILED
      );

      return {
        rollbackSucceeded: false,
        rollbackError: lastPersistenceError
      };
    }
  }

  function getPersistenceMetadata(extra = {}) {
    return {
      persistenceConsistent,
      lastPersistenceError,
      ...extra
    };
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
            metadata: createMetadata(
              getPersistenceMetadata({
                persisted: false
              })
            )
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: registration.datasetId,
            dataset: registration.dataset,
            metadata: createMetadata({
              persisted: true,
              persistenceConsistent: true,
              lastPersistenceError: null
            })
          };
        } catch (error) {
          const originalError = getErrorMessage(
            error,
            ERROR_MESSAGES.REGISTER_FAILED
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

            const persistenceRollback = await persistRollback();

            rollbackSucceeded =
              persistenceRollback.rollbackSucceeded;

            rollbackError =
              persistenceRollback.rollbackError;
          } catch (rollbackFailure) {
            persistenceConsistent = false;

            rollbackError = getErrorMessage(
              rollbackFailure,
              ERROR_MESSAGES.ROLLBACK_FAILED
            );

            lastPersistenceError = rollbackError;
          }

          return createError(originalError, {
            datasetId: registration.datasetId,
            rollbackSucceeded,
            rollbackError,
            metadata: getPersistenceMetadata({
              persisted: rollbackSucceeded
            })
          });
        }
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          ERROR_MESSAGES.REGISTER_FAILED
        ),
        {
          datasetId: null,
          metadata: getPersistenceMetadata({
            persisted: false
          })
        }
      );
    }
  }

  function search(query, options = {}) {
    assertOpen();

    if (!isPlainObject(options)) {
      return createError(
        ERROR_MESSAGES.INVALID_SEARCH_OPTIONS,
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
            ERROR_MESSAGES.DATASET_NOT_FOUND,
            {
              datasetId,
              removed: false,
              metadata: getPersistenceMetadata({
                persisted: false
              })
            }
          );
        }

        const removal = registry.removeDataset(datasetId);

        if (!removal.success) {
          return {
            ...removal,
            metadata: createMetadata(
              getPersistenceMetadata({
                persisted: false
              })
            )
          };
        }

        try {
          await saveInternal();

          return {
            success: true,
            datasetId: removal.datasetId,
            removed: true,
            metadata: createMetadata({
              persisted: true,
              persistenceConsistent: true,
              lastPersistenceError: null
            })
          };
        } catch (error) {
          const originalError = getErrorMessage(
            error,
            ERROR_MESSAGES.REMOVE_FAILED
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
                ERROR_MESSAGES.RESTORE_FAILED
              );
            }

            const persistenceRollback = await persistRollback();

            rollbackSucceeded =
              persistenceRollback.rollbackSucceeded;

            rollbackError =
              persistenceRollback.rollbackError;
          } catch (rollbackFailure) {
            persistenceConsistent = false;

            rollbackError = getErrorMessage(
              rollbackFailure,
              ERROR_MESSAGES.RESTORE_FAILED
            );

            lastPersistenceError = rollbackError;
          }

          return createError(originalError, {
            datasetId: removal.datasetId,
            removed: false,
            rollbackSucceeded,
            rollbackError,
            metadata: getPersistenceMetadata({
              persisted: rollbackSucceeded
            })
          });
        }
      });
    } catch (error) {
      return createError(
        getErrorMessage(
          error,
          ERROR_MESSAGES.REMOVE_FAILED
        ),
        {
          datasetId,
          removed: false,
          metadata: getPersistenceMetadata({
            persisted: false
          })
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
          metadata: createMetadata({
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
          ERROR_MESSAGES.SAVE_FAILED
        ),
        {
          metadata: getPersistenceMetadata({
            persisted: false
          })
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
      closed,
      closing
    });
  }

  function close() {
    if (closePromise) {
      return closePromise;
    }

    if (closed) {
      return Promise.resolve(false);
    }

    closing = true;

    // Të gjitha thirrjet e njëkohshme presin të njëjtën mbyllje.
    closePromise = (async () => {
      let operationQueueError = null;

      try {
        await operationQueue;
      } catch (error) {
        operationQueueError = error;
      }

      try {
        await bootstrap.close();
        closed = true;

        return true;
      } catch (error) {
        // Pipeline mbetet në gjendje closing për të shmangur
        // pranimin e operacioneve të reja pas një mbylljeje të pasigurt.
        persistenceConsistent = false;

        lastPersistenceError = getErrorMessage(
          error,
          "Mbyllja e Knowledge Dataset Pipeline dështoi."
        );

        throw error;
      } finally {
        if (closed) {
          closing = false;
        }

        // operationQueue është e mbrojtur nga refuzimet.
        // Variabla ruhet për diagnostikim nëse kërkohet më vonë.
        void operationQueueError;
      }
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
