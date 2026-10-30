
/**
 * XSUS AI Core — Model Selection Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përzgjedhja e modelit sipas kërkesës.
 * - Mbështetja e modelit të parazgjedhur.
 * - Filtrimi sipas gjuhës.
 * - Filtrimi sipas aftësive.
 * - Kontrolli i disponueshmërisë së modelit.
 *
 * Ky modul nuk ekzekuton vetë modele AI.
 */

export const MODEL_SELECTOR_VERSION = "1.0.0";

export const MODEL_SELECTION_ERRORS = Object.freeze({
  INVALID_REQUEST: "MODEL_SELECTION_INVALID_REQUEST",
  MODEL_NOT_FOUND: "MODEL_SELECTION_MODEL_NOT_FOUND",
  NO_COMPATIBLE_MODEL: "MODEL_SELECTION_NO_COMPATIBLE_MODEL",
  REGISTRY_INVALID: "MODEL_SELECTION_REGISTRY_INVALID",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeList(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new TypeError(
      "Lista e aftësive ose gjuhëve duhet të jetë array.",
    );
  }

  return [
    ...new Set(
      value
        .map(normalizeText)
        .filter(Boolean)
        .map((item) => item.toLowerCase()),
    ),
  ];
}

function createSelectionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createModelSelector(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "Konfigurimi i Model Selector duhet të jetë objekt.",
    );
  }

  const { registry, defaultModelId = null } = options;

  if (
    !registry ||
    typeof registry.get !== "function" ||
    typeof registry.list !== "function" ||
    typeof registry.has !== "function"
  ) {
    throw createSelectionError(
      MODEL_SELECTION_ERRORS.REGISTRY_INVALID,
      "Model Selector kërkon një Model Registry të vlefshëm.",
    );
  }

  const normalizedDefaultModelId =
    normalizeText(defaultModelId);

  function getCapabilities(adapter) {
    return normalizeList(adapter.capabilities);
  }

  function getLanguages(adapter) {
    return normalizeList(adapter.languages);
  }

  function supportsLanguage(adapter, language) {
    if (!language || language === "auto") {
      return true;
    }

    const languages = getLanguages(adapter);

    return (
      languages.length === 0 ||
      languages.includes(language.toLowerCase()) ||
      languages.includes("*")
    );
  }

  function supportsCapabilities(adapter, requiredCapabilities) {
    if (requiredCapabilities.length === 0) {
      return true;
    }

    const capabilities = getCapabilities(adapter);

    return requiredCapabilities.every((capability) =>
      capabilities.includes(capability),
    );
  }

  function isAvailable(adapter) {
    return adapter.available !== false;
  }

  function select(input = {}) {
    if (!isPlainObject(input)) {
      throw createSelectionError(
        MODEL_SELECTION_ERRORS.INVALID_REQUEST,
        "Kërkesa për përzgjedhjen e modelit duhet të jetë objekt.",
      );
    }

    const requestedModelId =
      normalizeText(input.modelId);

    const language =
      normalizeText(input.language)?.toLowerCase() ?? "auto";

    let requiredCapabilities;

    try {
      requiredCapabilities = normalizeList(
        input.requiredCapabilities,
      );
    } catch (error) {
      throw createSelectionError(
        MODEL_SELECTION_ERRORS.INVALID_REQUEST,
        error.message,
      );
    }

    if (requestedModelId) {
      const requestedAdapter = registry.get(requestedModelId);

      if (!requestedAdapter) {
        throw createSelectionError(
          MODEL_SELECTION_ERRORS.MODEL_NOT_FOUND,
          `Modeli "${requestedModelId}" nuk është regjistruar.`,
        );
      }

      if (
        !isAvailable(requestedAdapter) ||
        !supportsLanguage(requestedAdapter, language) ||
        !supportsCapabilities(
          requestedAdapter,
          requiredCapabilities,
        )
      ) {
        throw createSelectionError(
          MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
          `Modeli "${requestedModelId}" nuk i plotëson kërkesat.`,
        );
      }

      return requestedAdapter;
    }

    const adapters = registry.list();

    const compatibleAdapters = adapters.filter(
      (adapter) =>
        isAvailable(adapter) &&
        supportsLanguage(adapter, language) &&
        supportsCapabilities(adapter, requiredCapabilities),
    );

    if (compatibleAdapters.length === 0) {
      throw createSelectionError(
        MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        "Nuk u gjet asnjë model që plotëson kërkesat.",
      );
    }

    if (normalizedDefaultModelId) {
      const defaultAdapter = compatibleAdapters.find(
        (adapter) => adapter.id === normalizedDefaultModelId,
      );

      if (defaultAdapter) {
        return defaultAdapter;
      }
    }

    return compatibleAdapters[0];
  }

  function canSelect(input = {}) {
    try {
      select(input);
      return true;
    } catch {
      return false;
    }
  }

  function listCompatible(input = {}) {
    if (!isPlainObject(input)) {
      throw createSelectionError(
        MODEL_SELECTION_ERRORS.INVALID_REQUEST,
        "Filtrat duhet të jenë objekt.",
      );
    }

    const language =
      normalizeText(input.language)?.toLowerCase() ?? "auto";

    const requiredCapabilities = normalizeList(
      input.requiredCapabilities,
    );

    return registry.list().filter(
      (adapter) =>
        isAvailable(adapter) &&
        supportsLanguage(adapter, language) &&
        supportsCapabilities(adapter, requiredCapabilities),
    );
  }

  function getDefaultModel() {
    if (!normalizedDefaultModelId) {
      return null;
    }

    return registry.get(normalizedDefaultModelId);
  }

  function getStatus() {
    return {
      version: MODEL_SELECTOR_VERSION,
      defaultModelId: normalizedDefaultModelId,
      registeredModels: registry.list().length,
    };
  }

  return Object.freeze({
    select,
    canSelect,
    listCompatible,
    getDefaultModel,
    getStatus,
  });
}
