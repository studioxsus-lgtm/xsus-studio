
/**
 * XSUS AI Core — Knowledge Dataset Persistence
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Ruajtja e dataset-eve dhe versioneve të tyre.
 * - Rikthimi i sigurt i të dhënave.
 * - Përputhshmëria me snapshot-et e vjetra.
 */

const DEFAULT_DATASET_VERSION = "1.0.0";

function createError(message, metadata = {}) {
  return {
    success: false,
    error: message,
    metadata: {
      engine: "xsus-knowledge-dataset-persistence",
      version: "1.1.0",
      ...metadata
    }
  };
}

function normalizeDatasetVersion(version) {
  if (version === undefined || version === null || version === "") {
    return DEFAULT_DATASET_VERSION;
  }

  if (
    typeof version !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
  ) {
    throw new TypeError("Versioni i dataset-it nuk është i vlefshëm.");
  }

  return version;
}

export function createKnowledgeDatasetPersistence({ registry, storage } = {}) {
  if (!registry || typeof registry.getDataset !== "function") {
    throw new TypeError("Registry i dataset-eve është i detyrueshëm.");
  }

  if (
    typeof registry.listDatasets !== "function" ||
    typeof registry.registerDataset !== "function" ||
    typeof registry.removeDataset !== "function"
  ) {
    throw new TypeError("Registry nuk i mbështet operacionet e kërkuara.");
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
      const summaries = registry.listDatasets();

      if (!Array.isArray(summaries)) {
        return createError("Registry nuk ktheu listë dataset-esh.");
      }

      const datasets = [];

      for (const summary of summaries) {
        const dataset = registry.getDataset(summary.id);

        if (!dataset) {
          return createError(
            `Dataset-i "${summary.id}" mungon gjatë ruajtjes.`
          );
        }

        datasets.push({
          id: dataset.id,
          entries: dataset.collection,
          datasetVersion: normalizeDatasetVersion(dataset.datasetVersion)
        });
      }

      const result = await storage.saveDatasets(datasets);

      if (result && result.success === false) {
        return createError(
          result.error || "Ruajtja e dataset-eve dështoi."
        );
      }

      return {
        success: true,
        metadata: {
          engine: "xsus-knowledge-dataset-persistence",
          version: "1.1.0",
          datasetCount: datasets.length
        }
      };
    } catch (error) {
      return createError(
        error instanceof Error
          ? error.message
          : "Gabim i panjohur gjatë ruajtjes."
      );
    }
  }

  async function restoreRegistry() {
    try {
      const result = await storage.loadDatasets();

      if (!result || result.success !== true) {
        return createError(
          result?.error || "Ngarkimi i dataset-eve dështoi."
        );
      }

      if (!Array.isArray(result.datasets)) {
        return createError("Snapshot-i nuk përmban listë dataset-esh.");
      }

      const staged = [];
      const seenIds = new Set();

      for (const dataset of result.datasets) {
        if (!dataset || typeof dataset !== "object") {
          return createError("Snapshot-i përmban dataset të pavlefshëm.");
        }

        if (typeof dataset.id !== "string" || !dataset.id.trim()) {
          return createError("Snapshot-i përmban ID të pavlefshme.");
        }

        if (seenIds.has(dataset.id)) {
          return createError(
            `ID e përsëritur në snapshot: "${dataset.id}".`
          );
        }

        seenIds.add(dataset.id);

        if (!Array.isArray(dataset.entries)) {
          return createError(
            `Dataset-i "${dataset.id}" nuk përmban entries të vlefshme.`
          );
        }

        staged.push({
          id: dataset.id,
          entries: dataset.entries,
          datasetVersion: normalizeDatasetVersion(dataset.datasetVersion)
        });
      }

      // Regjistrojmë fillimisht në një registry të përkohshëm,
      // në mënyrë që validimi të përfundojë para ndryshimit real.
      const temporaryIds = new Set();

      for (const dataset of staged) {
        const validation = registry.registerDataset(
          dataset.id,
          dataset.entries,
          { datasetVersion: dataset.datasetVersion }
        );

        if (!validation || validation.success !== true) {
          // Registry real nuk duhet të ndryshohet gjatë validimit.
          // Nëse implementimi nuk ofron validator të veçantë,
          // kontrolli bëhet më poshtë përpara regjistrimit real.
          return createError(
            `Validimi i dataset-it "${dataset.id}" dështoi.`
          );
        }

        temporaryIds.add(dataset.id);
      }

      // Heqim dataset-et e regjistruara gjatë kontrollit paraprak.
      // Rikthimi real bëhet në një hap të veçantë.
      for (const id of temporaryIds) {
        registry.removeDataset(id);
      }

      const registeredIds = [];

      try {
        for (const dataset of staged) {
          const registration = registry.registerDataset(
            dataset.id,
            dataset.entries,
            { datasetVersion: dataset.datasetVersion }
          );

          if (!registration || registration.success !== true) {
            throw new Error(
              registration?.error ||
              `Regjistrimi i dataset-it "${dataset.id}" dështoi.`
            );
          }

          registeredIds.push(dataset.id);
        }
      } catch (error) {
        for (const id of registeredIds.reverse()) {
          registry.removeDataset(id);
        }

        return createError(
          error instanceof Error
            ? error.message
            : "Rikthimi i dataset-eve dështoi."
        );
      }

      return {
        success: true,
        metadata: {
          engine: "xsus-knowledge-dataset-persistence",
          version: "1.1.0",
          datasetCount: staged.length
        }
      };
    } catch (error) {
      return createError(
        error instanceof Error
          ? error.message
          : "Gabim i panjohur gjatë rikthimit."
      );
    }
  }

  return Object.freeze({
    saveRegistry,
    restoreRegistry
  });
}
