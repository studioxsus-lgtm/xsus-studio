
/**
 * XSUS AI — Knowledge Dataset Registry
 * Version: 1.1.0
 *
 * Regjistër në memorie për dataset-et e validuara.
 * Mbështet zëvendësim të kontrolluar për migrimet.
 */

import {
  validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

const ENGINE_NAME = "xsus-knowledge-dataset-registry";
const ENGINE_VERSION = "1.1.0";
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

export function createKnowledgeDatasetRegistry() {
  const datasets = new Map();

  function createRecord(id, entries) {
    const validation = validateKnowledgeDataset(entries);

    if (!validation.valid) {
      return {
        success: false,
        error: "Dataset-i nuk kaloi validimin.",
        validationErrors: validation.errors
      };
    }

    return {
      success: true,
      record: Object.freeze({
        id,
        collection: validation.collection,
        entryCount: validation.collection.length,
        schemaVersion: validation.metadata.schemaVersion
      })
    };
  }

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

    const result = createRecord(id, entries);

    if (!result.success) {
      return createRegistryResult(false, {
        datasetId: id,
        error: result.error,
        validationErrors: result.validationErrors
      });
    }

    datasets.set(id, result.record);

    return createRegistryResult(true, {
      datasetId: id,
      dataset: result.record
    });
  }

  /**
   * Zëvendëson një dataset ekzistues vetëm nëse
   * dataset-i i ri kalon validimin.
   * Në rast dështimi, rekordi ekzistues nuk ndryshon.
   */
  function replaceDataset(datasetId, entries) {
    let id;

    try {
      id = normalizeDatasetId(datasetId);
    } catch (error) {
      return createRegistryResult(false, {
        datasetId: null,
        replaced: false,
        error: error.message
      });
    }

    if (!datasets.has(id)) {
      return createRegistryResult(false, {
        datasetId: id,
        replaced: false,
        error: `Dataset-i "${id}" nuk u gjet.`
      });
    }

    const result = createRecord(id, entries);

    if (!result.success) {
      return createRegistryResult(false, {
        datasetId: id,
        replaced: false,
        error: result.error,
        validationErrors: result.validationErrors
      });
    }

    const previousDataset = datasets.get(id);

    datasets.set(id, result.record);

    return createRegistryResult(true, {
      datasetId: id,
      replaced: true,
      previousDataset,
      dataset: result.record
    });
  }

  function getDataset(datasetId) {
    let id;

    try {
      id = normalizeDatasetId(datasetId);
    } catch {
      return null;
    }

    return datasets.get(id) ?? null;
  }

  function listDatasets() {
    return Array.from(datasets.values(), dataset => ({
      id: dataset.id,
      entryCount: dataset.entryCount,
      schemaVersion: dataset.schemaVersion
    }));
  }

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
    replaceDataset,
    getDataset,
    listDatasets,
    removeDataset
  });
}

export default createKnowledgeDatasetRegistry;
