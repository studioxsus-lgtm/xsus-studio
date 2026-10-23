/**

* XSUS AI Core — Knowledge Dataset Pipeline
* Version: 1.2.0
* 
* Përmirësime:
* - Serializimi i operacioneve që ndryshojnë gjendjen.
* - Rikthimi i dataset-eve kur ruajtja dështon.
* - Gjurmimi i konsistencës së persistencës.
* - Raportimi i dështimeve të rikuperimit.
* - Metadata për gjendjen e fundit të storage-it.
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
const ENGINE_VERSION = "1.2.0";

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

let operationQueue = Promise.resolve();

// Këto vlera përshkruajnë besueshmërinë e gjendjes së persistuar.
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

if (result?.success === false) {
  const error = new Error(
    result.error || "Ruajtja e dataset-eve dështoi."
  );

  persistenceConsistent = false;
  lastPersistenceError = error.message;

  throw error;
}

// Ruajtja e suksesshme e snapshot-it aktual e rivendos
// besimin se gjendja në disk përputhet me regjistrin.
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
      // Rikthen gjendjen në memorie duke hequr regjistrimin
      // e saposhtuar. Operacionet serializohen, prandaj
      // dataset-i nuk është ndryshuar nga një operacion tjetër.
      const rollback = registry.removeDataset(
        registration.datasetId
      );

      if (!rollback.success) {
        persistenceConsistent = false;
        lastPersistenceError =
          rollback.error ||
          "Dataset-i nuk mund të hiqej gjatë rikuperimit.";
      }

      let persistenceRollback = {
        rollbackSucceeded: false,
        rollbackError: lastPersistenceError
      };

      if (rollback.success) {
        persistenceRollback = await persistRollback();
      }

      return createError(
        getErrorMessage(
          error,
          "Regjistrimi i dataset-it dështoi."
        ),
        {
          datasetId: registration.datasetId,
          rollbackSucceeded:
            rollback.success &&
            persistenceRollback.rollbackSucceeded,
          rollbackError:
            rollback.success
              ? persistenceRollback.rollbackError
              : lastPersistenceError,
          metadata: createSuccessMetadata({
            persisted: false,
            persistenceConsistent,
            lastPersistenceError
          })
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
    {
      datasetId: null,
      metadata: createSuccessMetadata({
        persistenceConsistent,
        lastPersistenceError
      })
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
          metadata: createSuccessMetadata({
            persistenceConsistent,
            lastPersistenceError
          })
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
      // Rikthen dataset-in në memorie.
      const restoration = registry.registerDataset(
        existingDataset.id,
        existingDataset.collection
      );

      if (!restoration.success) {
        persistenceConsistent = false;
        lastPersistenceError =
          restoration.error ||
          "Rikthimi i dataset-it në memorie dështoi.";

        return createError(
          getErrorMessage(
            error,
            "Heqja e dataset-it nuk mund të ruhej."
          ),
          {
            datasetId: removal.datasetId,
            removed: false,
            rollbackSucceeded: false,
            rollbackError: lastPersistenceError,
            metadata: createSuccessMetadata({
              persisted: false,
              persistenceConsistent,
              lastPersistenceError
            })
          }
        );
      }

      const rollback = await persistRollback();

      return createError(
        getErrorMessage(
          error,
          "Heqja e dataset-it nuk mund të ruhej."
        ),
        {
          datasetId: removal.datasetId,
          removed: false,
          rollbackSucceeded: rollback.rollbackSucceeded,
          rollbackError: rollback.rollbackError,
          metadata: createSuccessMetadata({
            persisted: rollback.rollbackSucceeded,
            persistenceConsistent,
            lastPersistenceError
          })
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
      removed: false,
      metadata: createSuccessMetadata({
        persistenceConsistent,
        lastPersistenceError
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
      metadata: createSuccessMetadata({
        persisted: false,
        persistenceConsistent,
        lastPersistenceError
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
closed
});
}

async function close() {
if (closed || closing) {
return false;
}

closing = true;

// Prit operacionet e pranuara para fillimit të mbylljes.
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
