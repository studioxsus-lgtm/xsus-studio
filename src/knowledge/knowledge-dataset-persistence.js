/**

* XSUS AI — Knowledge Dataset Persistence
* Version: 1.0.0
* 
* Lidh Dataset Registry me JSON Storage.
* Rikuperimi bëhet vetëm pas validimit të të gjitha dataset-eve.
  */

import {
createKnowledgeDatasetRegistry
} from "./knowledge-dataset-registry.js";

const ENGINE_NAME = "xsus-knowledge-dataset-persistence";
const ENGINE_VERSION = "1.0.0";

function createResult(success, fields = {}) {
return {
success,
...fields,
metadata: {
engine: ENGINE_NAME,
version: ENGINE_VERSION
}
};
}

function isStorageAdapter(storage) {
return (
storage !== null &&
typeof storage === "object" &&
typeof storage.saveDatasets === "function" &&
typeof storage.loadDatasets === "function"
);
}

function isRegistryAdapter(registry) {
return (
registry !== null &&
typeof registry === "object" &&
typeof registry.registerDataset === "function" &&
typeof registry.getDataset === "function" &&
typeof registry.listDatasets === "function" &&
typeof registry.removeDataset === "function"
);
}

/**

* Krijon shtresën e qëndrueshmërisë për një regjistër.
* 
* restoreRegistry() kërkon regjistër bosh.
* Në rast dështimi, nuk regjistron dataset-e pjesërisht.
  */
  export function createKnowledgeDatasetPersistence(options = {}) {
  const { registry, storage } = options;

if (!isRegistryAdapter(registry)) {
throw new TypeError(
"Regjistri i njohurive nuk është i vlefshëm."
);
}

if (!isStorageAdapter(storage)) {
throw new TypeError(
"Adapteri i ruajtjes nuk është i vlefshëm."
);
}

let operationQueue = Promise.resolve();

function serializeOperation(operation) {
const result = operationQueue.then(operation, operation);

operationQueue = result.then(
  () => undefined,
  () => undefined
);

return result;

}

async function saveRegistry() {
return serializeOperation(async () => {
try {
const summaries = registry.listDatasets();
const datasets = [];

    for (const summary of summaries) {
      const dataset = registry.getDataset(summary.id);

      if (
        !dataset ||
        !Array.isArray(dataset.collection)
      ) {
        return createResult(false, {
          error:
            `Dataset-i "${summary.id}" nuk mund të lexohet nga regjistri.`
        });
      }

      datasets.push({
        id: dataset.id,
        entries: dataset.collection
      });
    }

    const result = await storage.saveDatasets(datasets);

    if (!result?.success) {
      return createResult(false, {
        error:
          result?.error ??
          "Regjistri nuk mund të ruhej."
      });
    }

    return createResult(true, {
      datasetCount: datasets.length
    });
  } catch {
    return createResult(false, {
      error: "Ndodhi një gabim gjatë ruajtjes së regjistrit."
    });
  }
});

}

async function restoreRegistry() {
return serializeOperation(async () => {
try {
if (registry.listDatasets().length !== 0) {
return createResult(false, {
restored: false,
error:
"Rikuperimi kërkon një regjistër bosh."
});
}

    const loaded = await storage.loadDatasets();

    if (!loaded?.success || !Array.isArray(loaded.datasets)) {
      return createResult(false, {
        restored: false,
        error:
          loaded?.error ??
          "Dataset-et nuk mund të rikuperoheshin."
      });
    }

    // Përgatit dhe kontrollon të gjitha dataset-et
    // në një regjistër të përkohshëm përpara ndryshimit
    // të regjistrit të synuar.
    const stagedRegistry = createKnowledgeDatasetRegistry();

    for (const dataset of loaded.datasets) {
      const result = stagedRegistry.registerDataset(
        dataset.id,
        dataset.entries
      );

      if (!result.success) {
        return createResult(false, {
          restored: false,
          error:
            result.error ??
            `Dataset-i "${dataset.id}" nuk mund të rikuperohej.`
        });
      }
    }

    const stagedDatasets = stagedRegistry.listDatasets();

    // Regjistro vetëm pasi të gjitha hyrjet kalojnë
    // validimin paraprak.
    const registeredIds = [];

    for (const summary of stagedDatasets) {
      const dataset = stagedRegistry.getDataset(summary.id);

      const result = registry.registerDataset(
        dataset.id,
        dataset.collection
      );

      if (!result.success) {
        // Pastron vetëm dataset-et e shtuara nga ky operacion.
        for (const id of registeredIds) {
          registry.removeDataset(id);
        }

        return createResult(false, {
          restored: false,
          error:
            result.error ??
            `Dataset-i "${dataset.id}" nuk mund të regjistrohej.`
        });
      }

      registeredIds.push(dataset.id);
    }

    return createResult(true, {
      restored: true,
      datasetCount: registeredIds.length,
      datasetIds: registeredIds
    });
  } catch {
    return createResult(false, {
      restored: false,
      error: "Ndodhi një gabim gjatë rikuperimit të regjistrit."
    });
  }
});

}

return Object.freeze({
saveRegistry,
restoreRegistry
});
}
