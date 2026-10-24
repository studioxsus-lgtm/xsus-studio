
/**
 * XSUS AI — Knowledge Dataset Registry
 * Version: 1.2.1
 *
 * Regjistër në memorie për dataset-et e validuara.
 * Dallon versionin e skemës nga versioni i dataset-it.
 * Ruajtja e API-së ekzistuese për listDatasets().
 */

import {
  validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

const ENGINE_NAME = "xsus-knowledge-dataset-registry";
const ENGINE_VERSION = "1.2.1";
const MAX_DATASET_ID_LENGTH = 120;
const DEFAULT_DATASET_VERSION = "1.0.0";

const DATASET_ID_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;

const DATASET_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

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

function normalizeDatasetVersion(value) {
  if (value === undefined) {
    return DEFAULT_DATASET_VERSION;
  }

  if (
    typeof value !== "string" ||
    !DATASET_VERSION_PATTERN.test(value)
  ) {
    throw new TypeError(
      "Versioni i dataset-it duhet të jetë në formatin X.Y.Z."
    );
  }

  return value;
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

  function createRecord(id, entries, datasetVersion) {
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
        schemaVersion: validation.metadata.schemaVersion,
        datasetVersion
      })
    };
  }

  /**
   * Regjistron një dataset të ri.
   * Nuk mbishkruan ID ekzistuese.
   */
  function registerDataset(datasetId, entries, options = {}) {
    let id;
    let datasetVersion;

    try {
      id = normalizeDatasetId(datasetId);
      datasetVersion = normalizeDatasetVersion(
        options?.datasetVersion
      );
    } catch (error) {
      return createRegistryResult(false, {
        datasetId: null,
        error: error.message
      });
    }

    if (datasets.has(id)) {
      return createRegistryResult(false, {
        datasetId: id,
        error: `Dataset-i "${id}" është regjistruar tashmë.`
      });
    }

    const result = createRecord(
      id,
      entries,
      datasetVersion
    );

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
   * Zëvendëson një dataset ekzistues vetëm pas validimit.
   * Nëse validimi dështon, rekordi origjinal mbetet i paprekur.
   */
  function replaceDataset(datasetId, entries, options = {}) {
    let id;
    let datasetVersion;

    try {
      id = normalizeDatasetId(datasetId);
      datasetVersion = normalizeDatasetVersion(
        options?.datasetVersion
      );
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

    const result = createRecord(
      id,
      entries,
      datasetVersion
    );

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

  /**
   * Kthen dataset-in e plotë, përfshirë datasetVersion,
   * ose null nëse ID nuk ekziston.
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
   * Ruhet struktura publike ekzistuese.
   * datasetVersion nuk shtohet në këtë rezultat,
   * për të ruajtur përputhshmërinë me testet dhe thirrësit.
   */
  function listDatasets() {
    return Array.from(datasets.values(), dataset => ({
      id: dataset.id,
      entryCount: dataset.entryCount,
      schemaVersion: dataset.schemaVersion
    }));
  }

  /**
   * Heq dataset-in me ID të dhënë.
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
        : {
            error: `Dataset-i "${id}" nuk u gjet.`
          })
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
