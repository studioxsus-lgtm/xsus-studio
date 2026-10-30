
/**
 * XSUS AI Core — Model Registry
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i model adapter-ëve.
 * - Kërkimi sipas ID-së.
 * - Listimi i modeleve.
 * - Parandalimi i ID-ve të dyfishta.
 * - Heqja e adapter-ëve.
 *
 * Ky modul nuk ekzekuton vetë modele AI.
 */

export const MODEL_REGISTRY_VERSION = "1.0.0";

export const MODEL_REGISTRY_ERRORS = Object.freeze({
  INVALID_ADAPTER: "MODEL_REGISTRY_INVALID_ADAPTER",
  DUPLICATE_ID: "MODEL_REGISTRY_DUPLICATE_ID",
  NOT_FOUND: "MODEL_REGISTRY_NOT_FOUND",
  INVALID_ID: "MODEL_REGISTRY_INVALID_ID",
});

function validateId(id) {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError(
      "Identifikuesi i modelit duhet të jetë tekst i vlefshëm.",
    );
  }

  return id.trim();
}

function validateAdapter(adapter) {
  if (
    adapter === null ||
    typeof adapter !== "object" ||
    Array.isArray(adapter)
  ) {
    throw new TypeError(
      "Model adapter duhet të jetë objekt.",
    );
  }

  if (
    typeof adapter.id !== "string" ||
    adapter.id.trim().length === 0
  ) {
    throw new TypeError(
      "Model adapter duhet të ketë një ID të vlefshme.",
    );
  }

  if (typeof adapter.generate !== "function") {
    throw new TypeError(
      "Model adapter duhet të implementojë generate().",
    );
  }

  return adapter;
}

export function createModelRegistry(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Konfigurimi i Model Registry duhet të jetë objekt.",
    );
  }

  const models = new Map();

  const initialAdapters = Array.isArray(options.adapters)
    ? options.adapters
    : [];

  function register(adapter) {
    validateAdapter(adapter);

    const id = validateId(adapter.id);

    if (models.has(id)) {
      const error = new Error(
        `Model adapter me ID "${id}" është regjistruar tashmë.`,
      );

      error.code = MODEL_REGISTRY_ERRORS.DUPLICATE_ID;

      throw error;
    }

    models.set(id, adapter);

    return adapter;
  }

  function get(id) {
    const normalizedId = validateId(id);
    return models.get(normalizedId) ?? null;
  }

  function has(id) {
    const normalizedId = validateId(id);
    return models.has(normalizedId);
  }

  function list() {
    return Array.from(models.values());
  }

  function listMetadata() {
    return list().map((adapter) => ({
      id: adapter.id,
      type: adapter.type ?? "custom",
      modelId: adapter.modelId ?? null,
      version: adapter.version ?? null,
    }));
  }

  function unregister(id) {
    const normalizedId = validateId(id);

    return models.delete(normalizedId);
  }

  function clear() {
    const removedCount = models.size;
    models.clear();

    return removedCount;
  }

  function getSize() {
    return models.size;
  }

  function getStatus() {
    return {
      version: MODEL_REGISTRY_VERSION,
      size: models.size,
      modelIds: Array.from(models.keys()),
    };
  }

  for (const adapter of initialAdapters) {
    register(adapter);
  }

  return Object.freeze({
    register,
    get,
    has,
    list,
    listMetadata,
    unregister,
    clear,
    getSize,
    getStatus,
  });
}
