/**
 * XSUS AI — Knowledge Dataset Validator
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Validimi i dataset-eve përpara integrimit.
 * - Ripërdorimi i standardit ekzistues Knowledge Entry.
 * - Kontrolli i ID-ve të përsëritura.
 * - Refuzimi i dataset-eve me hyrje të pavlefshme.
 * - Kthimi i rezultateve dhe gabimeve të strukturuara.
 *
 * Parimi:
 * Nëse një hyrje është e pavlefshme, dataset-i i plotë
 * refuzohet. Hyrjet origjinale nuk modifikohen.
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

  try {
    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  } catch {
    return false;
  }
}

function normalizeId(value) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    return value.normalize("NFC").trim();
  } catch {
    return "";
  }
}

function createMetadata(
  totalEntries,
  validEntries,
  invalidEntries
) {
  return {
    engine: ENGINE_NAME,
    version: ENGINE_VERSION,
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
    totalEntries,
    validEntries,
    invalidEntries
  };
}

function createInvalidResult(
  input,
  errors,
  validEntries = 0
) {
  const totalEntries = Array.isArray(input)
    ? input.length
    : 0;

  const safeValidEntries = Math.max(
    0,
    Math.min(validEntries, totalEntries)
  );

  return {
    valid: false,
    collection: null,
    errors,
    metadata: createMetadata(
      totalEntries,
      safeValidEntries,
      totalEntries - safeValidEntries
    )
  };
}

function createEntryError(index, id, message) {
  return {
    index,
    id: id || null,
    message
  };
}

/**
 * Validon një dataset pa lejuar pranimin e pjesshëm.
 *
 * Rezultati:
 * {
 *   valid: boolean,
 *   collection: object | null,
 *   errors: Array,
 *   metadata: object
 * }
 *
 * validEntries:
 * Numri i hyrjeve që kalojnë validimin individual
 * dhe kontrollin e identifikuesve të përsëritur.
 *
 * invalidEntries:
 * Numri i hyrjeve që nuk përfshihen në këtë grup.
 *
 * Ky funksion nuk modifikon hyrjet origjinale.
 */
export function validateKnowledgeDataset(input) {
  if (!Array.isArray(input)) {
    return createInvalidResult(input, [
      createEntryError(
        null,
        null,
        "Dataset-i i njohurive duhet të jetë një varg."
      )
    ]);
  }

  const errors = [];
  const seenIds = new Set();
  const normalizedEntries = [];

  for (let index = 0; index < input.length; index += 1) {
    let entry;
    let id = "";

    try {
      entry = input[index];

      if (!isPlainObject(entry)) {
        errors.push(
          createEntryError(
            index,
            null,
            "Hyrja e dataset-it duhet të jetë objekt i thjeshtë."
          )
        );

        continue;
      }

      id = normalizeId(entry.id);

      const validation = validateKnowledgeEntry(entry);

      if (
        !validation ||
        typeof validation.valid !== "boolean"
      ) {
        errors.push(
          createEntryError(
            index,
            id,
            "Validuesi i hyrjes ktheu një rezultat të pavlefshëm."
          )
        );

        continue;
      }

      if (!validation.valid) {
        const validationErrors = Array.isArray(
          validation.errors
        )
          ? validation.errors
          : ["Hyrja nuk kaloi validimin."];

        for (const message of validationErrors) {
          errors.push(
            createEntryError(
              index,
              id,
              typeof message === "string"
                ? message
                : "Hyrja përmban një gabim validimi."
            )
          );
        }

        continue;
      }

      if (!id) {
        errors.push(
          createEntryError(
            index,
            null,
            "Hyrja duhet të ketë një ID të vlefshme."
          )
        );

        continue;
      }

      if (seenIds.has(id)) {
        errors.push(
          createEntryError(
            index,
            id,
            `ID e përsëritur në dataset: "${id}".`
          )
        );

        continue;
      }

      seenIds.add(id);
      normalizedEntries.push(entry);
    } catch (error) {
      errors.push(
        createEntryError(
          index,
          id,
          error instanceof Error
            ? `Gabim gjatë validimit të hyrjes: ${error.message}`
            : "Ndodhi një gabim i panjohur gjatë validimit të hyrjes."
        )
      );
    }
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
    collection = createKnowledgeCollection(
      normalizedEntries
    );
  } catch (error) {
    return createInvalidResult(
      input,
      [
        createEntryError(
          null,
          null,
          error instanceof Error
            ? error.message
            : "Dataset-i nuk mund të krijohet."
        )
      ],
      0
    );
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
