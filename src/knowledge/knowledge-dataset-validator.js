/**

* XSUS AI — Knowledge Dataset Validator
* Version: 1.0.0
* 
* Validon dataset-et përpara integrimit në Knowledge Service.
* Ripërdor standardin ekzistues Knowledge Entry.
  */

import {
createKnowledgeCollection,
validateKnowledgeEntry,
KNOWLEDGE_SCHEMA_VERSION
} from "./knowledge-entry.js";

const ENGINE_NAME = "xsus-knowledge-dataset-validator";
const ENGINE_VERSION = "1.0.0";

function isPlainObject(value) {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
}

function normalizeId(value) {
return typeof value === "string"
? value.normalize("NFC").trim()
: "";
}

/**

* Kontrollon një dataset pa hedhur gabime te thirrësi.
* 
* Nëse qoftë edhe një hyrje është e pavlefshme,
* collection kthehet null për të parandaluar
* pranimin e pjesshëm të dataset-it.
  */
  export function validateKnowledgeDataset(input) {
  const errors = [];

if (!Array.isArray(input)) {
return {
valid: false,
collection: null,
errors: [{
index: null,
id: null,
message: "Dataset-i i njohurive duhet të jetë një varg."
}],
metadata: {
engine: ENGINE_NAME,
version: ENGINE_VERSION,
schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
totalEntries: 0,
validEntries: 0,
invalidEntries: 0
}
};
}

const seenIds = new Set();
let validEntries = 0;

for (let index = 0; index < input.length; index += 1) {
const entry = input[index];

if (!isPlainObject(entry)) {
  errors.push({
    index,
    id: null,
    message: "Hyrja e dataset-it duhet të jetë objekt i thjeshtë."
  });

  continue;
}

const id = normalizeId(entry.id);
const validation = validateKnowledgeEntry(entry);

if (!validation.valid) {
  for (const message of validation.errors) {
    errors.push({
      index,
      id: id || null,
      message
    });
  }

  continue;
}

if (seenIds.has(id)) {
  errors.push({
    index,
    id,
    message: `ID e përsëritur në dataset: "${id}".`
  });

  continue;
}

seenIds.add(id);
validEntries += 1;

}

let collection = null;

if (errors.length === 0) {
try {
collection = createKnowledgeCollection(input);
} catch (error) {
errors.push({
index: null,
id: null,
message: error instanceof Error
? error.message
: "Dataset-i nuk mund të krijohet."
});
}
}

const valid = errors.length === 0 && collection !== null;

return {
valid,
collection: valid ? collection : null,
errors,
metadata: {
engine: ENGINE_NAME,
version: ENGINE_VERSION,
schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
totalEntries: input.length,
validEntries,
invalidEntries: input.length - validEntries
}
};
}
