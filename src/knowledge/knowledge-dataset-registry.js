/**

* XSUS AI — Knowledge Dataset Registry
* Version: 1.0.0
* 
* Regjistër në memorie për dataset-et e validuara.
* Nuk ndryshon Knowledge Service ose burimet ekzistuese.
  */

import {
validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

const ENGINE_NAME = "xsus-knowledge-dataset-registry";
const ENGINE_VERSION = "1.0.0";
const MAX_DATASET_ID_LENGTH = 120;

const DATASET_ID_PATTERN =
/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;

function normalizeDatasetId(value) {
if (typeof value !== "string") {
throw new TypeError(
"ID e dataset-it duhet të jetë tekst."
);
}

const id = value.normalize("NFC").trim();

if (
!id ||
id.length > MAX_DATASET_ID_LENGTH ||
!DATASET_ID_PATTERN.test(id)
) {
throw new TypeError(
"ID e dataset-it nuk është e vlefshme."
);
}

return id;
}

function createRegistryResult(success, fields = {}) {
return {
success,
...fields,
metadata: {
engine: ENGINE_NAME,
version: ENGINE_VERSION
}
};
}

/**

* Krijon një regjistër të pavarur në memorie.
* 
* Secili regjistër ka hapësirën e vet të dataset-eve.
  */
  export function createKnowledgeDatasetRegistry() {
  const datasets = new Map();

/**

* Regjistron dataset vetëm nëse validimi kalon.
* Një ID ekzistuese nuk mbishkruhet.
  */
  function registerDataset(datasetId, entries) {
  let id;

try {
  id = normalizeDatasetId(datasetId);
} catch (error) {
  return createRegistryResult(false, {
    error: error.message,
    datasetId: null
  });
}

if (datasets.has(id)) {
  return createRegistryResult(false, {
    datasetId: id,
    error: `Dataset-i "${id}" është regjistruar tashmë.`
  });
}

const validation = validateKnowledgeDataset(entries);

if (!validation.valid) {
  return createRegistryResult(false, {
    datasetId: id,
    error: "Dataset-i nuk kaloi validimin.",
    validationErrors: validation.errors
  });
}

const record = Object.freeze({
  id,
  collection: validation.collection,
  entryCount: validation.collection.length,
  schemaVersion: validation.metadata.schemaVersion
});

datasets.set(id, record);

return createRegistryResult(true, {
  datasetId: id,
  dataset: record
});

}

/**

* Kthen një dataset të regjistruar ose null.
  */
  function getDataset(datasetId) {
  let id;

try {
  id = normalizeDatasetId(datasetId);
} catch {
  return null;
}

return datasets.get(id) ?? null;

}

/**

* Kthen metadata për të gjitha dataset-et.
* Nuk ekspozon Map-in e brendshëm.
  */
  function listDatasets() {
  return Array.from(datasets.values(), dataset => ({
  id: dataset.id,
  entryCount: dataset.entryCount,
  schemaVersion: dataset.schemaVersion
  }));
  }

/**

* Heq vetëm dataset-in me ID të dhënë.
  */
  function removeDataset(datasetId) {
  let id;

try {
  id = normalizeDatasetId(datasetId);
} catch (error) {
  return createRegistryResult(false, {
    datasetId: null,
    error: error.message,
    removed: false
  });
}

const removed = datasets.delete(id);

return createRegistryResult(removed, {
  datasetId: id,
  removed,
  ...(removed
    ? {}
    : { error: `Dataset-i "${id}" nuk u gjet.` })
});

}

return Object.freeze({
registerDataset,
getDataset,
listDatasets,
removeDataset
});
}
