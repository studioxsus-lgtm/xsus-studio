/**

* XSUS AI — Knowledge Dataset Storage
* Version: 1.0.0
* 
* Ruajtje dhe rikuperim i dataset-eve përmes JSON.
* Çdo dataset validohet para ruajtjes dhe pas ngarkimit.
  */

import { readFile, writeFile, rename, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";

import {
validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

const ENGINE_NAME = "xsus-knowledge-dataset-storage";
const ENGINE_VERSION = "1.0.0";
const STORAGE_FORMAT_VERSION = "1.0.0";

function isPlainObject(value) {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
}

function normalizeDatasetId(value) {
if (typeof value !== "string") {
return null;
}

const id = value.normalize("NFC").trim();

if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/u.test(id)) {
return null;
}

return id;
}

function createResult(success, fields = {}) {
return {
success,
...fields,
metadata: {
engine: ENGINE_NAME,
version: ENGINE_VERSION,
formatVersion: STORAGE_FORMAT_VERSION
}
};
}

function validateSnapshot(snapshot) {
if (
!isPlainObject(snapshot) ||
snapshot.formatVersion !== STORAGE_FORMAT_VERSION ||
!Array.isArray(snapshot.datasets)
) {
return {
valid: false,
error: "Struktura e skedarit JSON nuk është e vlefshme."
};
}

const ids = new Set();
const datasets = [];

for (let index = 0; index < snapshot.datasets.length; index += 1) {
const dataset = snapshot.datasets[index];

if (!isPlainObject(dataset)) {
  return {
    valid: false,
    error: `Dataset-i në pozicionin ${index} nuk është objekt i vlefshëm.`
  };
}

const id = normalizeDatasetId(dataset.id);

if (!id) {
  return {
    valid: false,
    error: `ID e dataset-it në pozicionin ${index} nuk është e vlefshme.`
  };
}

if (ids.has(id)) {
  return {
    valid: false,
    error: `ID e përsëritur në skedarin JSON: "${id}".`
  };
}

if (!Array.isArray(dataset.entries)) {
  return {
    valid: false,
    error: `Dataset-i "${id}" nuk përmban një varg hyrjesh.`
  };
}

const validation = validateKnowledgeDataset(dataset.entries);

if (!validation.valid) {
  return {
    valid: false,
    error: `Dataset-i "${id}" nuk kaloi validimin.`,
    validationErrors: validation.errors
  };
}

ids.add(id);

datasets.push({
  id,
  entries: validation.collection
});

}

return {
valid: true,
datasets
};
}

/**

* Krijon një adapter ruajtjeje për një skedar JSON.
* 
* saveDatasets pranon:
* [{ id: "sq-general", entries: [...] }]
* 
* loadDatasets kthen dataset-et vetëm nëse i gjithë
* skedari dhe çdo dataset janë të vlefshëm.
  */
  export function createKnowledgeDatasetStorage(options = {}) {
  const filePath = options.filePath;

if (typeof filePath !== "string" || !filePath.trim()) {
throw new TypeError(
"Duhet të jepet rruga e skedarit JSON."
);
}

let operationQueue = Promise.resolve();
let temporaryFileCounter = 0;

function serializeOperation(operation) {
const result = operationQueue.then(operation, operation);

operationQueue = result.then(
  () => undefined,
  () => undefined
);

return result;

}

async function saveDatasets(datasets) {
return serializeOperation(async () => {
const snapshot = {
formatVersion: STORAGE_FORMAT_VERSION,
datasets
};

  const validation = validateSnapshot(snapshot);

  if (!validation.valid) {
    return createResult(false, {
      error: validation.error,
      validationErrors: validation.validationErrors ?? []
    });
  }

  const normalizedSnapshot = {
    formatVersion: STORAGE_FORMAT_VERSION,
    datasets: validation.datasets.map(dataset => ({
      id: dataset.id,
      entries: dataset.entries
    }))
  };

  const serialized = `${JSON.stringify(normalizedSnapshot, null, 2)}\n`;
  const directory = dirname(filePath);

  const temporaryPath =
    `${filePath}.tmp-${process.pid}-${++temporaryFileCounter}`;

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, serialized, {
      encoding: "utf8",
      flag: "wx"
    });

    await rename(temporaryPath, filePath);

    return createResult(true, {
      datasetCount: normalizedSnapshot.datasets.length
    });
  } catch {
    try {
      await rm(temporaryPath, { force: true });
    } catch {
      // Ruajmë gabimin kryesor të operacionit.
    }

    return createResult(false, {
      error: "Dataset-et nuk mund të ruheshin në skedarin JSON."
    });
  }
});

}

async function loadDatasets() {
return serializeOperation(async () => {
let contents;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createResult(true, {
        datasets: [],
        datasetCount: 0,
        recovered: false
      });
    }

    return createResult(false, {
      datasets: null,
      error: "Skedari JSON nuk mund të lexohej."
    });
  }

  let snapshot;

  try {
    snapshot = JSON.parse(contents);
  } catch {
    return createResult(false, {
      datasets: null,
      error: "Skedari JSON është i korruptuar."
    });
  }

  const validation = validateSnapshot(snapshot);

  if (!validation.valid) {
    return createResult(false, {
      datasets: null,
      error: validation.error,
      validationErrors: validation.validationErrors ?? []
    });
  }

  return createResult(true, {
    datasets: validation.datasets,
    datasetCount: validation.datasets.length,
    recovered: true
  });
});

}

return Object.freeze({
saveDatasets,
loadDatasets
});
}
