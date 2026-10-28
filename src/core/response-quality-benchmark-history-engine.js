
/**
 * XSUS AI Core — Response Quality Benchmark History Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ruajtja e historikut të raporteve benchmark.
 * - Listimi i raporteve sipas rendit kronologjik.
 * - Kërkimi sipas identifikuesit.
 * - Kufizimi i madhësisë së historikut.
 * - Pastrimi i kontrolluar i historikut.
 * - Mbrojtja e integritetit të të dhënave.
 *
 * Shënim:
 * Ky modul ruan historikun në RAM.
 * Nuk ofron ende persistencë në disk.
 */

export const RESPONSE_QUALITY_BENCHMARK_HISTORY_ENGINE_VERSION =
  "1.0.0";

export const DEFAULT_BENCHMARK_HISTORY_LIMIT = 1000;

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

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  if (isPlainObject(value)) {
    const clone = {};

    for (const key of Object.keys(value)) {
      clone[key] = deepClone(value[key]);
    }

    return clone;
  }

  return value;
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

function createImmutableSnapshot(value) {
  return deepFreeze(deepClone(value));
}

function validateNonEmptyString(value, name) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      name + " duhet të jetë tekst jo bosh."
    );
  }

  return value.trim();
}

function validateTimestamp(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new TypeError(
      "timestamp duhet të jetë numër i vlefshëm jo negativ."
    );
  }

  return value;
}

function validateLimit(value) {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new TypeError(
      "maxEntries duhet të jetë numër i plotë pozitiv."
    );
  }

  return value;
}

function validateReport(report) {
  if (!isPlainObject(report)) {
    throw new TypeError(
      "report duhet të jetë objekt i thjeshtë."
    );
  }

  if (!isPlainObject(report.summary)) {
    throw new TypeError(
      "report.summary duhet të jetë objekt i thjeshtë."
    );
  }

  if (!Array.isArray(report.results)) {
    throw new TypeError(
      "report.results duhet të jetë një array."
    );
  }

  return report;
}

/**
 * Krijon një motor të pavarur për historikun benchmark.
 *
 * @param {object} options
 * @param {number} options.maxEntries
 * @returns {object}
 */
export function createResponseQualityBenchmarkHistoryEngine(
  options = {}
) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "options duhet të jetë objekt i thjeshtë."
    );
  }

  const maxEntries = validateLimit(
    options.maxEntries === undefined
      ? DEFAULT_BENCHMARK_HISTORY_LIMIT
      : options.maxEntries
  );

  let entries = [];
  let nextSequence = 1;

  /**
   * Shton një raport në historik.
   *
   * ID duhet të jetë unike brenda këtij historiku.
   * timestamp është opsional; parazgjedhja është Date.now().
   */
  function addReport(input) {
    if (!isPlainObject(input)) {
      throw new TypeError(
        "entry duhet të jetë objekt i thjeshtë."
      );
    }

    const id = validateNonEmptyString(
      input.id,
      "id"
    );

    if (
      entries.some((entry) => entry.id === id)
    ) {
      throw new TypeError(
        "Raporti ekziston tashmë në historik: " +
          id +
          "."
      );
    }

    const report = validateReport(input.report);

    const timestamp = validateTimestamp(
      input.timestamp === undefined
        ? Date.now()
        : input.timestamp
    );

    const entry = createImmutableSnapshot({
      id,
      timestamp,
      sequence: nextSequence,
      report,
    });

    nextSequence += 1;

    entries = [...entries, entry];

    if (entries.length > maxEntries) {
      entries = entries.slice(
        entries.length - maxEntries
      );
    }

    return entry;
  }

  /**
   * Kthen historikun nga më i riu te më i vjetri.
   *
   * limit është opsional.
   */
  function listReports(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError(
        "options duhet të jetë objekt i thjeshtë."
      );
    }

    let limit;

    if (options.limit !== undefined) {
      limit = validateLimit(options.limit);
    }

    const sorted = [...entries].sort(
      (a, b) =>
        b.timestamp - a.timestamp ||
        b.sequence - a.sequence
    );

    const selected =
      limit === undefined
        ? sorted
        : sorted.slice(0, limit);

    return createImmutableSnapshot(selected);
  }

  /**
   * Kërkon një raport me ID të saktë.
   *
   * Kthen null nëse raporti nuk gjendet.
   */
  function getReportById(id) {
    const validatedId = validateNonEmptyString(
      id,
      "id"
    );

    const entry = entries.find(
      (item) => item.id === validatedId
    );

    return entry
      ? createImmutableSnapshot(entry)
      : null;
  }

  /**
   * Kthen raportin më të fundit sipas rendit kronologjik.
   */
  function getLatestReport() {
    const latest = listReports({ limit: 1 });

    return latest.length > 0
      ? latest[0]
      : null;
  }

  /**
   * Fshin një raport të vetëm sipas ID-së.
   *
   * Kthen true nëse u fshi, përndryshe false.
   */
  function removeReport(id) {
    const validatedId = validateNonEmptyString(
      id,
      "id"
    );

    const originalLength = entries.length;

    entries = entries.filter(
      (entry) => entry.id !== validatedId
    );

    return entries.length !== originalLength;
  }

  /**
   * Pastron të gjithë historikun.
   *
   * Kthen numrin e raporteve të fshira.
   */
  function clearHistory() {
    const removedCount = entries.length;

    entries = [];

    return removedCount;
  }

  /**
   * Kthen numrin aktual të raporteve.
   */
  function getHistorySize() {
    return entries.length;
  }

  /**
   * Kthen konfigurimin e motorit.
   */
  function getMetadata() {
    return createImmutableSnapshot({
      version:
        RESPONSE_QUALITY_BENCHMARK_HISTORY_ENGINE_VERSION,
      maxEntries,
      entryCount: entries.length,
    });
  }

  return Object.freeze({
    addReport,
    listReports,
    getReportById,
    getLatestReport,
    removeReport,
    clearHistory,
    getHistorySize,
    getMetadata,
  });
}

export default createResponseQualityBenchmarkHistoryEngine;
