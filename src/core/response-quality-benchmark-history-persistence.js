
/**
 * XSUS AI Core — Response Quality Benchmark History Persistence
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Integron history engine me JSON storage.
 * - Rikthen historikun gjatë inicializimit.
 * - Persiston ndryshimet në disk.
 * - Serializon shkrimet për të shmangur garat.
 * - Ruajtja dhe motori mbeten module të pavarura.
 */

export const RESPONSE_QUALITY_BENCHMARK_HISTORY_PERSISTENCE_VERSION =
  "1.0.0";

const ERROR_MESSAGES = Object.freeze({
  INVALID_DEPENDENCIES:
    "Varësitë e integrimit të historikut benchmark janë të pavlefshme.",
  INITIALIZATION:
    "Inicializimi i historikut benchmark dështoi.",
  ALREADY_POPULATED:
    "Motori i historikut benchmark duhet të jetë bosh gjatë inicializimit.",
  PERSISTENCE:
    "Sinkronizimi i historikut benchmark me diskun dështoi.",
});

function validateDependencies(engine, storage) {
  const engineMethods = [
    "addReport",
    "listReports",
    "getReportById",
    "getLatestReport",
    "removeReport",
    "clearHistory",
    "getHistorySize",
    "getMetadata",
  ];

  const storageMethods = ["loadHistory", "saveHistory"];

  const validEngine =
    engine !== null &&
    typeof engine === "object" &&
    engineMethods.every((method) => typeof engine[method] === "function");

  const validStorage =
    storage !== null &&
    typeof storage === "object" &&
    storageMethods.every((method) => typeof storage[method] === "function");

  if (!validEngine || !validStorage) {
    throw new TypeError(ERROR_MESSAGES.INVALID_DEPENDENCIES);
  }
}

function sortBySequenceAscending(entries) {
  return [...entries].sort((a, b) => a.sequence - b.sequence);
}

function createPersistenceError(cause) {
  const error = new Error(ERROR_MESSAGES.PERSISTENCE, { cause });
  error.code = "BENCHMARK_HISTORY_PERSISTENCE_ERROR";
  return error;
}

/**
 * Krijon shtresën e integrimit midis engine dhe storage.
 *
 * @param {object} options
 * @param {object} options.engine
 * @param {object} options.storage
 * @returns {object}
 */
export function createResponseQualityBenchmarkHistoryPersistence({
  engine,
  storage,
} = {}) {
  validateDependencies(engine, storage);

  let initialized = false;
  let initializationPromise = null;

  // Çdo shkrim pret përfundimin e shkrimit të mëparshëm.
  let writeQueue = Promise.resolve();

  function enqueueSave(snapshot) {
    const operation = writeQueue.then(() => storage.saveHistory(snapshot));

    // Një dështim nuk duhet ta bllokojë përgjithmonë radhën.
    writeQueue = operation.catch(() => undefined);

    return operation.catch((cause) => {
      throw createPersistenceError(cause);
    });
  }

  function createSnapshot() {
    return sortBySequenceAscending(engine.listReports());
  }

  async function persistCurrentHistory() {
    const snapshot = createSnapshot();
    return enqueueSave(snapshot);
  }

  async function initialize() {
    if (initialized) {
      return getMetadata();
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      try {
        if (engine.getHistorySize() !== 0) {
          throw new Error(ERROR_MESSAGES.ALREADY_POPULATED);
        }

        const entries = await storage.loadHistory();

        if (!Array.isArray(entries)) {
          throw new TypeError(
            "Storage duhet të kthejë një listë të historikut."
          );
        }

        // Rikrijojmë rendin origjinal të futjes.
        // Engine cakton vetë numrat e rinj të sequence.
        for (const entry of sortBySequenceAscending(entries)) {
          engine.addReport({
            id: entry.id,
            timestamp: entry.timestamp,
            report: entry.report,
          });
        }

        initialized = true;
        return getMetadata();
      } catch (cause) {
        // Mos lëmë histori të rikthyer pjesërisht.
        if (engine.getHistorySize() > 0) {
          engine.clearHistory();
        }

        throw new Error(ERROR_MESSAGES.INITIALIZATION, { cause });
      } finally {
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  }

  function ensureInitialized() {
    if (!initialized) {
      throw new Error(
        "Inicializo historikun benchmark përpara se ta përdorësh."
      );
    }
  }

  async function addReport(input) {
    ensureInitialized();

    // Engine e validon dhe e shton raportin në RAM.
    const entry = engine.addReport(input);

    // Shkrimet ruhen në rendin në të cilin futen në radhë.
    // Nëse shkrimi dështon, raporti mbetet në RAM dhe gabimi
    // i kthehet thirrësit; nuk pretendojmë se disku u sinkronizua.
    await persistCurrentHistory();

    return entry;
  }

  async function removeReport(id) {
    ensureInitialized();

    const removed = engine.removeReport(id);

    if (removed) {
      await persistCurrentHistory();
    }

    return removed;
  }

  async function clearHistory() {
    ensureInitialized();

    engine.clearHistory();
    return persistCurrentHistory();
  }

  async function flush() {
    // Prit shkrimet e planifikuara deri në këtë pikë.
    await writeQueue;
  }

  function getMetadata() {
    return Object.freeze({
      version: RESPONSE_QUALITY_BENCHMARK_HISTORY_PERSISTENCE_VERSION,
      initialized,
      historySize: engine.getHistorySize(),
      engine: engine.getMetadata(),
    });
  }

  return Object.freeze({
    initialize,
    addReport,
    listReports(options) {
      ensureInitialized();
      return engine.listReports(options);
    },
    getReportById(id) {
      ensureInitialized();
      return engine.getReportById(id);
    },
    getLatestReport() {
      ensureInitialized();
      return engine.getLatestReport();
    },
    removeReport,
    clearHistory,
    getHistorySize() {
      ensureInitialized();
      return engine.getHistorySize();
    },
    getMetadata,
    flush,
  });
}
