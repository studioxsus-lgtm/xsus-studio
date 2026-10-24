/**

* XSUS AI Core — Knowledge Dataset Bootstrap
* Version: 1.1.1
* 
* Përgjegjësitë:
* 1. Krijon registry-n e dataset-eve.
* 2. Inicializon storage real ose adapter të injektuar.
* 3. Krijon sistemin e persistence.
* 4. Rikthen dataset-et e ruajtura.
* 5. Regjistron integrimin me Knowledge Service.
* 6. Mundëson mbylljen e sigurt të integrimit.
* 7. Pastron burimet nëse inicializimi dështon.
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
const ENGINE_VERSION = "1.1.1";

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

function validateRestorationResult(restoration) {
if (
restoration === null ||
restoration === undefined ||
restoration?.success === false
) {
throw new Error(
"Rikthimi i dataset-eve të XSUS AI dështoi."
);
}

return restoration;
}

export async function initializeKnowledgeDatasets({
filePath,
storageAdapter
} = {}) {
if (
!storageAdapter &&
(typeof filePath !== "string" || !filePath.trim())
) {
throw new TypeError(
"filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
);
}

if (storageAdapter) {
validateStorageAdapter(storageAdapter);
}

const registry = createKnowledgeDatasetRegistry();

const storage = storageAdapter
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
// Rikthe dataset-et përpara regjistrimit të burimit.
const restoration = validateRestorationResult(
await persistence.restoreRegistry()
);

integration = registerKnowledgeDatasetIntegration({
  registry
});

if (!integration?.success) {
  throw new Error(
    integration?.error ||
    "Regjistrimi i integrimit të knowledge datasets dështoi."
  );
}

function assertOpen() {
  if (closed) {
    throw new Error(
      "Inicializuesi i dataset-eve është mbyllur."
    );
  }
}

function close() {
  if (closed) {
    return false;
  }

  closed = true;

  if (typeof integration?.close === "function") {
    integration.close();
  } else if (
    typeof integration?.unregister === "function"
  ) {
    integration.unregister();
  }

  return true;
}

return Object.freeze({
  success: true,
  registry,
  storage,
  persistence,
  integration,
  restoration,

  async save() {
    assertOpen();
    return persistence.saveRegistry();
  },

  close,

  getMetadata() {
    return Object.freeze({
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      storageMode: storageAdapter ? "adapter" : "file"
    });
  }
});

} catch (error) {
// Mos lër burim të regjistruar nëse inicializimi dështon.
if (integration) {
if (typeof integration.close === "function") {
integration.close();
} else if (
typeof integration.unregister === "function"
) {
integration.unregister();
}
}

throw error;

}
}

export default initializeKnowledgeDatasets;
