/**

* XSUS AI Core — Knowledge Dataset Persistence
* Version: 1.2.1
* 
* - Ruajtje e dataset-eve dhe versioneve.
* - Rikuperim atomik.
* - Refuzim kur regjistri real nuk është bosh.
* - Përputhshmëri me snapshot-et e vjetra.
* - Kthim i ID-ve të rikuperuara për API dhe teste.
    */

import { createKnowledgeDatasetRegistry } from "./knowledge-dataset-registry.js";

const VERSION = "1.2.1";
const DEFAULT_DATASET_VERSION = "1.0.0";
const ENGINE = "xsus-knowledge-dataset-persistence";

function failure(message, extra = {}) {
return {
success: false,
restored: false,
error: message,
...extra,
metadata: {
engine: ENGINE,
version: VERSION
}
};
}

function normalizeDatasetVersion(value) {
if (value === undefined || value === null || value === "") {
return DEFAULT_DATASET_VERSION;
}

if (
typeof value !== "string" ||
!/^(0|[1-9]\d*).(0|[1-9]\d*).(0|[1-9]\d*)$/.test(value)
) {
throw new TypeError("Versioni i dataset-it nuk është i vlefshëm.");
}

return value;
}

function getDatasetSummaries(registry) {
const datasets = registry.listDatasets();

if (!Array.isArray(datasets)) {
throw new Error("Registry nuk ktheu listë dataset-esh.");
}

return datasets;
}

function isEmptyRegistry(registry) {
return getDatasetSummaries(registry).length === 0;
}

function normalizeSnapshotDataset(dataset) {
if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
throw new TypeError("Snapshot-i përmban dataset të pavlefshëm.");
}

if (typeof dataset.id !== "string" || !dataset.id.trim()) {
throw new TypeError("Dataset-i përmban ID të pavlefshme.");
}

if (!Array.isArray(dataset.entries)) {
throw new TypeError(
"Dataset-i "${dataset.id}" nuk përmban entries të vlefshme."
);
}

return {
id: dataset.id,
entries: dataset.entries,
datasetVersion: normalizeDatasetVersion(dataset.datasetVersion)
};
}

export function createKnowledgeDatasetPersistence({ registry, storage } = {}) {
if (
!registry ||
typeof registry.listDatasets !== "function" ||
typeof registry.getDataset !== "function" ||
typeof registry.registerDataset !== "function" ||
typeof registry.removeDataset !== "function"
) {
throw new TypeError("Registry i dataset-eve është i pavlefshëm.");
}

if (
!storage ||
typeof storage.saveDatasets !== "function" ||
typeof storage.loadDatasets !== "function"
) {
throw new TypeError("Storage adapter është i pavlefshëm.");
}

async function saveRegistry() {
try {
const summaries = getDatasetSummaries(registry);
const datasets = [];

  for (const summary of summaries) {
    const dataset = registry.getDataset(summary.id);

    if (!dataset) {
      return {
        success: false,
        error: `Dataset-i "${summary.id}" mungon gjatë ruajtjes.`,
        datasetCount: 0
      };
    }

    datasets.push({
      id: dataset.id,
      entries: dataset.collection,
      datasetVersion: normalizeDatasetVersion(dataset.datasetVersion)
    });
  }

  const saved = await storage.saveDatasets(datasets);

  if (saved?.success === false) {
    return {
      success: false,
      error: saved.error || "Ruajtja e dataset-eve dështoi.",
      datasetCount: 0
    };
  }

  return {
    success: true,
    datasetCount: datasets.length,
    metadata: {
      engine: ENGINE,
      version: VERSION,
      datasetCount: datasets.length
    }
  };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error
      ? error.message
      : "Gabim i panjohur gjatë ruajtjes.",
    datasetCount: 0
  };
}

}

async function restoreRegistry() {
// Refuzo para se të lexosh storage nëse registry nuk është bosh.
try {
if (!isEmptyRegistry(registry)) {
return failure(
"Rikuperimi refuzohet sepse registry nuk është bosh."
);
}
} catch (error) {
return failure(
error instanceof Error
? error.message
: "Nuk mund të kontrollohet registry."
);
}

let loaded;

try {
  loaded = await storage.loadDatasets();
} catch (error) {
  return failure(
    error instanceof Error
      ? error.message
      : "Ngarkimi i dataset-eve dështoi."
  );
}

if (!loaded || loaded.success !== true || !Array.isArray(loaded.datasets)) {
  return failure(
    loaded?.error || "Storage ktheu një snapshot të pavlefshëm."
  );
}

let staged;

try {
  const seenIds = new Set();

  staged = loaded.datasets.map((item) => {
    const dataset = normalizeSnapshotDataset(item);

    if (seenIds.has(dataset.id)) {
      throw new Error(
        `ID e përsëritur në snapshot: "${dataset.id}".`
      );
    }

    seenIds.add(dataset.id);
    return dataset;
  });
} catch (error) {
  return failure(
    error instanceof Error
      ? error.message
      : "Snapshot-i përmban të dhëna të pavlefshme."
  );
}

// Valido të gjitha dataset-et në një registry të përkohshëm.
try {
  const temporaryRegistry = createKnowledgeDatasetRegistry();

  for (const dataset of staged) {
    const result = temporaryRegistry.registerDataset(
      dataset.id,
      dataset.entries,
      { datasetVersion: dataset.datasetVersion }
    );

    if (!result || result.success !== true) {
      throw new Error(
        result?.error ||
        `Validimi i dataset-it "${dataset.id}" dështoi.`
      );
    }
  }
} catch (error) {
  return failure(
    error instanceof Error
      ? error.message
      : "Validimi paraprak i dataset-eve dështoi."
  );
}

// Kontrollo përsëri para ndryshimit të registry-t real.
try {
  if (!isEmptyRegistry(registry)) {
    return failure(
      "Rikuperimi refuzohet sepse registry nuk është bosh."
    );
  }
} catch (error) {
  return failure(
    error instanceof Error
      ? error.message
      : "Nuk mund të kontrollohet registry."
  );
}

const registeredIds = [];

try {
  for (const dataset of staged) {
    const result = registry.registerDataset(
      dataset.id,
      dataset.entries,
      { datasetVersion: dataset.datasetVersion }
    );

    if (!result || result.success !== true) {
      throw new Error(
        result?.error ||
        `Regjistrimi i dataset-it "${dataset.id}" dështoi.`
      );
    }

    registeredIds.push(dataset.id);
  }

  const datasetIds = [...registeredIds];

  return {
    success: true,
    restored: true,
    datasetCount: datasetIds.length,
    datasetIds,
    metadata: {
      engine: ENGINE,
      version: VERSION,
      datasetCount: datasetIds.length,
      datasetIds: [...datasetIds]
    }
  };
} catch (error) {
  // Në dështim, hiq dataset-et e regjistruara nga ky rikuperim.
  for (const id of [...registeredIds].reverse()) {
    try {
      registry.removeDataset(id);
    } catch {
      // Ruaj gabimin origjinal.
    }
  }

  return failure(
    error instanceof Error
      ? error.message
      : "Rikuperimi i dataset-eve dështoi."
  );
}

}

return Object.freeze({
saveRegistry,
restoreRegistry
});
}
