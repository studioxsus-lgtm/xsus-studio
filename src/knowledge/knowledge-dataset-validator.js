
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

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeId(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim()
    : "";
}

function createMetadata(totalEntries, validEntries, invalidEntries) {
  return {
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    totalEntries,
    validEntries,
    invalidEntries
  };
}

function createInvalidResult(input, errors, validEntries = 0) {
  const totalEntries = Array.isArray(input) ? input.length : 0;

  return {
    valid: false,
    collection: null,
    errors,
    metadata: createMetadata(
      totalEntries,
      validEntries,
      totalEntries - validEntries
    )
  };
}

/**
 * Kontrollon dataset-in pa hedhur gabime te thirrësi.
 *
 * Nëse qoftë edhe një hyrje është e pavlefshme,
 * koleksioni kthehet null për të parandaluar
 * pranimin e pjesshëm të dataset-it.
 */
export function validateKnowledgeDataset(input) {
  if (!Array.isArray(input)) {
    return createInvalidResult(input, [
      {
        index: null,
        id: null,
        message: "Dataset-i i njohurive duhet të jetë një varg."
      }
    ]);
  }

  const errors = [];
  const seenIds = new Set();
  const normalizedEntries = [];

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
    normalizedEntries.push(entry);
  }

  if (errors.length > 0) {
    return createInvalidResult(
      input,
      errors,
      normalizedEntries.length
    );
  }

  let collection;

  try {
    collection = createKnowledgeCollection(normalizedEntries);
  } catch (error) {
    return createInvalidResult(input, [
      {
        index: null,
        id: null,
        message:
          error instanceof Error
            ? error.message
            : "Dataset-i nuk mund të krijohet."
      }
    ]);
  }

  return {
    valid: true,
    collection,
    errors: [],
    metadata: createMetadata(
      input.length,
      normalizedEntries.length,
      0
    )
  };
}
