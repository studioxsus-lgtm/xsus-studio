
/**
 * XSUS AI Core — Benchmark History Persistence Recovery
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Rikuperimi pas dështimit të ruajtjes.
 * - Riprovimi i ruajtjes së historikut.
 * - Monitorimi i gjendjes së sinkronizimit.
 * - Ruajtja e API-ve ekzistuese.
 */

export const RESPONSE_QUALITY_BENCHMARK_HISTORY_RECOVERY_VERSION =
  "1.0.0";

const ERROR_MESSAGES = Object.freeze({
  INVALID_DEPENDENCIES:
    "Varësitë e rikuperimit të historikut benchmark janë të pavlefshme.",
  SAVE_FAILED:
    "Rikuperimi i ruajtjes së historikut benchmark dështoi.",
  INVALID_RETRIES:
    "Numri i riprovimeve duhet të jetë numër i plotë jo negativ.",
});

function validateDependencies(persistence, storage, maxRetries) {
  if (
    !persistence ||
    typeof persistence.initialize !== "function" ||
    typeof persistence.listReports !== "function" ||
    typeof persistence.getMetadata !== "function" ||
    typeof storage?.saveHistory !== "function"
  ) {
    throw new TypeError(ERROR_MESSAGES.INVALID_DEPENDENCIES);
  }

  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new RangeError(ERROR_MESSAGES.INVALID_RETRIES);
  }
}

function sortBySequence(entries) {
  return [...entries].sort((a, b) => a.sequence - b.sequence);
}

function createSaveError(cause, attempts) {
  const error = new Error(ERROR_MESSAGES.SAVE_FAILED, { cause });
  error.code = "BENCHMARK_HISTORY_RECOVERY_FAILED";
  error.attempts = attempts;
  return error;
}

/**
 * @param {object} options
 * @param {object} options.persistence
 * @param {object} options.storage
 * @param {number} [options.maxRetries=3]
 */
export function createResponseQualityBenchmarkHistoryRecovery({
  persistence,
  storage,
  maxRetries = 3,
} = {}) {
  validateDependencies(persistence, storage, maxRetries);

  let status = "unknown";
  let lastError = null;
  let lastSuccessfulSaveAt = null;
  let totalAttempts = 0;
  let recoveryPromise = null;

  function getStatus() {
    return Object.freeze({
      version: RESPONSE_QUALITY_BENCHMARK_HISTORY_RECOVERY_VERSION,
      status,
      synchronized: status === "synchronized",
      lastError,
      lastSuccessfulSaveAt,
      totalAttempts,
      maxRetries,
    });
  }

  async function recover() {
    // Shmang dy procese rikuperimi paralele në të njëjtin instancë.
    if (recoveryPromise) {
      return recoveryPromise;
    }

    recoveryPromise = performRecovery();

    try {
      return await recoveryPromise;
    } finally {
      recoveryPromise = null;
    }
  }

  async function performRecovery() {
    status = "recovering";
    lastError = null;

    try {
      await persistence.initialize();
    } catch (cause) {
      status = "failed";
      lastError = cause.message;

      throw createSaveError(cause, 0);
    }

    // Përfshin përpjekjen fillestare dhe deri në maxRetries
    // riprovime shtesë.
    const maximumAttempts = maxRetries + 1;
    let lastCause;

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      totalAttempts += 1;

      try {
        const snapshot = sortBySequence(persistence.listReports());

        await storage.saveHistory(snapshot);

        status = "synchronized";
        lastError = null;
        lastSuccessfulSaveAt = new Date().toISOString();

        return getStatus();
      } catch (cause) {
        lastCause = cause;
        lastError = cause?.message ?? String(cause);
        status = "retrying";
      }
    }

    status = "failed";
    throw createSaveError(lastCause, maximumAttempts);
  }

  return Object.freeze({
    recover,
    getStatus,
  });
}
