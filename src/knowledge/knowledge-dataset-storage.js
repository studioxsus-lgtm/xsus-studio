/**
 * XSUS AI — Knowledge Dataset Storage
 * Version: 1.1.0
 *
 * Përmirësime:
 * - Validim i plotë para ruajtjes dhe pas ngarkimit.
 * - Ruajtje dhe rikthim i versionit të dataset-it.
 * - Përputhshmëri me snapshot-et e vjetra pa datasetVersion.
 * - Shkrim në skedar të përkohshëm me flush të të dhënave.
 * - Zëvendësim atomik përmes rename().
 * - Pastrim i skedarëve të përkohshëm pas dështimit.
 * - Refuzim i JSON-it të korruptuar pa e trajtuar si bosh.
 * - Serializim i operacioneve brenda instancës.
 * - Injeksion opsional i operacioneve të skedarëve për testim.
 */

import {
  readFile,
  open,
  rename,
  mkdir,
  rm
} from "node:fs/promises";

import { dirname } from "node:path";

import {
  validateKnowledgeDataset
} from "./knowledge-dataset-validator.js";

const ENGINE_NAME = "xsus-knowledge-dataset-storage";
const ENGINE_VERSION = "1.1.0";
const STORAGE_FORMAT_VERSION = "1.0.0";
const DEFAULT_DATASET_VERSION = "1.0.0";

const REQUIRED_FILE_SYSTEM_METHODS = [
  "readFile",
  "open",
  "rename",
  "mkdir",
  "rm"
];

const DEFAULT_FILE_SYSTEM = Object.freeze({
  readFile,
  open,
  rename,
  mkdir,
  rm
});

/**
 * Kontrollon nëse vlera është objekt i thjeshtë.
 */
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

/**
 * Normalizon dhe validon ID-në e dataset-it.
 */
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

/**
 * Normalizon versionin semantik të dataset-it.
 *
 * Snapshot-et e vjetra pa version përdorin 1.0.0.
 */
function normalizeDatasetVersion(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_DATASET_VERSION;
  }

  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(value)
  ) {
    return null;
  }

  return value;
}

/**
 * Krijon një rezultat standard të storage.
 */
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

/**
 * Kontrollon operacionet e injektuara të sistemit të skedarëve.
 *
 * Adapteri duhet të implementojë të pesë metodat.
 * Kur nuk jepet adapter, përdoren metodat standarde të Node.js.
 */
function resolveFileSystem(fileSystem) {
  if (!isPlainObject(fileSystem)) {
    throw new TypeError(
      "Adapteri i sistemit të skedarëve duhet të jetë objekt."
    );
  }

  for (const method of REQUIRED_FILE_SYSTEM_METHODS) {
    if (typeof fileSystem[method] !== "function") {
      throw new TypeError(
        `Adapteri i sistemit të skedarëve duhet të implementojë "${method}".`
      );
    }
  }

  return fileSystem;
}

/**
 * Validon të gjithë snapshot-in dhe normalizon dataset-et.
 */
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

  for (
    let index = 0;
    index < snapshot.datasets.length;
    index += 1
  ) {
    const dataset = snapshot.datasets[index];

    if (!isPlainObject(dataset)) {
      return {
        valid: false,
        error:
          `Dataset-i në pozicionin ${index} nuk është objekt i vlefshëm.`
      };
    }

    const id = normalizeDatasetId(dataset.id);

    if (!id) {
      return {
        valid: false,
        error:
          `ID e dataset-it në pozicionin ${index} nuk është e vlefshme.`
      };
    }

    if (ids.has(id)) {
      return {
        valid: false,
        error:
          `ID e përsëritur në skedarin JSON: "${id}".`
      };
    }

    if (!Array.isArray(dataset.entries)) {
      return {
        valid: false,
        error:
          `Dataset-i "${id}" nuk përmban një varg hyrjesh.`
      };
    }

    const datasetVersion = normalizeDatasetVersion(
      dataset.datasetVersion ?? dataset.version
    );

    if (!datasetVersion) {
      return {
        valid: false,
        error:
          `Versioni i dataset-it "${id}" nuk është i vlefshëm.`
      };
    }

    const validation = validateKnowledgeDataset(
      dataset.entries
    );

    if (!validation.valid) {
      return {
        valid: false,
        error:
          `Dataset-i "${id}" nuk kaloi validimin.`,
        validationErrors: validation.errors ?? []
      };
    }

    ids.add(id);

    datasets.push({
      id,
      entries: validation.collection,
      datasetVersion
    });
  }

  return {
    valid: true,
    datasets
  };
}

/**
 * Shkruan të dhënat në një skedar të përkohshëm.
 *
 * sync() kërkon sinkronizimin e të dhënave të skedarit
 * përpara zëvendësimit.
 */
async function writeTemporaryFile(
  temporaryPath,
  serialized,
  fileSystem
) {
  const handle = await fileSystem.open(
    temporaryPath,
    "wx",
    0o600
  );

  try {
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Krijon një adapter ruajtjeje për një skedar JSON.
 *
 * Opsionet:
 * - filePath: rruga e skedarit JSON, e detyrueshme.
 * - fileSystem: adapter opsional për operacionet e skedarëve.
 *
 * Adapteri fileSystem duhet të ofrojë:
 * readFile, open, rename, mkdir dhe rm.
 */
export function createKnowledgeDatasetStorage(options = {}) {
  const suppliedPath = options.filePath;

  if (
    typeof suppliedPath !== "string" ||
    !suppliedPath.trim()
  ) {
    throw new TypeError(
      "Duhet të jepet rruga e skedarit JSON."
    );
  }

  const filePath = suppliedPath.trim();

  const fileSystem = resolveFileSystem(
    options.fileSystem ?? DEFAULT_FILE_SYSTEM
  );

  let operationQueue = Promise.resolve();
  let temporaryFileCounter = 0;

  /**
   * Serializon operacionet brenda kësaj instance.
   */
  function serializeOperation(operation) {
    const result = operationQueue.then(
      operation,
      operation
    );

    operationQueue = result.then(
      () => undefined,
      () => undefined
    );

    return result;
  }

  /**
   * Ruajtja e dataset-eve në skedarin JSON.
   */
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
          validationErrors:
            validation.validationErrors ?? []
        });
      }

      const normalizedSnapshot = {
        formatVersion: STORAGE_FORMAT_VERSION,
        datasets: validation.datasets.map((dataset) => ({
          id: dataset.id,
          entries: dataset.entries,
          datasetVersion: dataset.datasetVersion
        }))
      };

      let serialized;

      try {
        serialized =
          `${JSON.stringify(normalizedSnapshot, null, 2)}\n`;
      } catch {
        return createResult(false, {
          error:
            "Dataset-et nuk mund të serializoheshin në JSON."
        });
      }

      const directory = dirname(filePath);

      const temporaryPath =
        `${filePath}.tmp-${process.pid}-${++temporaryFileCounter}`;

      try {
        await fileSystem.mkdir(directory, {
          recursive: true
        });

        await writeTemporaryFile(
          temporaryPath,
          serialized,
          fileSystem
        );

        await fileSystem.rename(
          temporaryPath,
          filePath
        );

        return createResult(true, {
          datasetCount: normalizedSnapshot.datasets.length
        });
      } catch {
        try {
          await fileSystem.rm(temporaryPath, {
            force: true
          });
        } catch {
          // Ruajmë rezultatin e dështimit kryesor.
        }

        return createResult(false, {
          error:
            "Dataset-et nuk mund të ruheshin në skedarin JSON."
        });
      }
    });
  }

  /**
   * Ngarkimi dhe validimi i dataset-eve nga skedari JSON.
   */
  async function loadDatasets() {
    return serializeOperation(async () => {
      let contents;

      try {
        contents = await fileSystem.readFile(
          filePath,
          "utf8"
        );
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
          validationErrors:
            validation.validationErrors ?? []
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

export default createKnowledgeDatasetStorage;
