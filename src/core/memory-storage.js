
/**
 * XSUS AI Core — Memory Storage Adapter
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ofron një ndërfaqe të standardizuar për ruajtjen e memories.
 * - Izolon të dhënat nga objektet origjinale.
 * - Validon çelësat dhe të dhënat JSON.
 * - Mundëson zëvendësimin e ruajtjes në RAM me ruajtje në disk ose databazë.
 *
 * Shënim:
 * Ky adapter ruan të dhënat në RAM. Nuk ofron ende ruajtje
 * të qëndrueshme pas rinisjes së procesit.
 */

export const MEMORY_STORAGE_VERSION = "1.0.0";

function normalizeKey(key) {
  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Çelësi i memories duhet të jetë tekst jo bosh.");
  }

  return key.trim();
}

function cloneJSON(value) {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error(
      "Të dhënat e memories nuk mund të serializohen në JSON."
    );
  }

  if (serialized === undefined) {
    throw new Error(
      "Të dhënat e memories duhet të jenë të vlefshme për JSON."
    );
  }

  try {
    return JSON.parse(serialized);
  } catch {
    throw new Error(
      "Të dhënat e memories nuk mund të kopjohen nga JSON."
    );
  }
}

function validateValue(value) {
  cloneJSON(value);
}

export function createMemoryStorageAdapter(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Opsionet e storage adapter janë të pavlefshme.");
  }

  const store = new Map();

  async function get(key) {
    const normalizedKey = normalizeKey(key);

    if (!store.has(normalizedKey)) {
      return null;
    }

    return cloneJSON(store.get(normalizedKey));
  }

  async function set(key, value) {
    const normalizedKey = normalizeKey(key);

    validateValue(value);

    // Ruajmë një kopje që ndryshimet e jashtme të mos prekin storage.
    const clonedValue = cloneJSON(value);

    store.set(normalizedKey, clonedValue);

    return {
      saved: true,
      key: normalizedKey,
    };
  }

  async function remove(key) {
    const normalizedKey = normalizeKey(key);
    const deleted = store.delete(normalizedKey);

    return {
      deleted,
      key: normalizedKey,
    };
  }

  async function has(key) {
    const normalizedKey = normalizeKey(key);
    return store.has(normalizedKey);
  }

  async function keys() {
    return Array.from(store.keys());
  }

  async function clear() {
    const removedEntries = store.size;

    store.clear();

    return {
      cleared: true,
      removedEntries,
    };
  }

  async function getStats() {
    return {
      version: MEMORY_STORAGE_VERSION,
      entries: store.size,
      adapter: "memory",
    };
  }

  return Object.freeze({
    get,
    set,
    delete: remove,
    has,
    keys,
    clear,
    getStats,
  });
}
