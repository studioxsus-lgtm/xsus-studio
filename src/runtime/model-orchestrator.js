
/**
 * XSUS AI Core — Model Orchestrator
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Koordinon Model Registry dhe Model Selector.
 * - Përzgjedh adapter-in e përshtatshëm.
 * - Krijon dhe menaxhon Model Runtime.
 * - Inicializon modelin sipas nevojës.
 * - Ekzekuton gjenerimin e përgjigjeve.
 * - Menaxhon mbylljen e runtime-ve.
 *
 * Ky modul nuk përmban vetë një model AI.
 */

import {
  createModelRuntime,
} from "./model-runtime.js";

export const MODEL_ORCHESTRATOR_VERSION = "1.0.0";

export const MODEL_ORCHESTRATOR_ERRORS = Object.freeze({
  INVALID_CONFIGURATION: "MODEL_ORCHESTRATOR_INVALID_CONFIGURATION",
  MODEL_NOT_FOUND: "MODEL_ORCHESTRATOR_MODEL_NOT_FOUND",
  RUNTIME_CREATION_FAILED: "MODEL_ORCHESTRATOR_RUNTIME_CREATION_FAILED",
  GENERATION_FAILED: "MODEL_ORCHESTRATOR_GENERATION_FAILED",
  CLOSED: "MODEL_ORCHESTRATOR_CLOSED",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function createOrchestratorError(code, message, cause) {
  const error = new Error(message);

  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

export function createModelOrchestrator(options = {}) {
  if (!isPlainObject(options)) {
    throw createOrchestratorError(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      "Konfigurimi i Model Orchestrator duhet të jetë objekt.",
    );
  }

  const { registry, selector, defaultModelId = null } = options;

  if (
    !registry ||
    typeof registry.get !== "function" ||
    typeof registry.list !== "function"
  ) {
    throw createOrchestratorError(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      "Model Orchestrator kërkon një Model Registry të vlefshëm.",
    );
  }

  if (
    !selector ||
    typeof selector.select !== "function"
  ) {
    throw createOrchestratorError(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      "Model Orchestrator kërkon një Model Selector të vlefshëm.",
    );
  }

  if (
    defaultModelId !== null &&
    (
      typeof defaultModelId !== "string" ||
      defaultModelId.trim().length === 0
    )
  ) {
    throw createOrchestratorError(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      "defaultModelId duhet të jetë tekst ose null.",
    );
  }

  const runtimes = new Map();
  const initializationPromises = new Map();

  let closed = false;
  let closePromise = null;

  function ensureOpen() {
    if (closed) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.CLOSED,
        "Model Orchestrator është mbyllur.",
      );
    }
  }

  function getRuntime(adapter) {
    const existingRuntime = runtimes.get(adapter.id);

    if (existingRuntime) {
      return existingRuntime;
    }

    try {
      const runtime = createModelRuntime({
        modelId: adapter.modelId,
        adapter,
      });

      runtimes.set(adapter.id, runtime);

      return runtime;
    } catch (error) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.RUNTIME_CREATION_FAILED,
        `Krijimi i runtime për modelin "${adapter.id}" dështoi.`,
        error,
      );
    }
  }

  async function initializeRuntime(adapter) {
    ensureOpen();

    const existingPromise = initializationPromises.get(adapter.id);

    if (existingPromise) {
      return existingPromise;
    }

    const runtime = getRuntime(adapter);

    const initializationPromise = runtime.initialize();

    initializationPromises.set(
      adapter.id,
      initializationPromise,
    );

    try {
      return await initializationPromise;
    } finally {
      if (
        initializationPromises.get(adapter.id) ===
        initializationPromise
      ) {
        initializationPromises.delete(adapter.id);
      }
    }
  }

  function selectAdapter(input = {}) {
    ensureOpen();

    const requestedModelId =
      input.modelId ?? defaultModelId;

    try {
      return selector.select({
        ...input,
        modelId: requestedModelId,
      });
    } catch (error) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
        error.message || "Nuk u gjet model i përshtatshëm.",
        error,
      );
    }
  }

  async function generate(input = {}) {
    ensureOpen();

    if (!isPlainObject(input)) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
        "Kërkesa për gjenerim duhet të jetë objekt.",
      );
    }

    const adapter = selectAdapter(input);

    await initializeRuntime(adapter);

    ensureOpen();

    const runtime = runtimes.get(adapter.id);

    try {
      return await runtime.generate({
        ...input,
        modelId: adapter.modelId,
      });
    } catch (error) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
        error.message || "Gjenerimi i përgjigjes dështoi.",
        error,
      );
    }
  }

  async function initialize(modelId = null) {
    ensureOpen();

    let adapter;

    try {
      adapter = modelId
        ? selector.select({ modelId })
        : selector.select({});
    } catch (error) {
      throw createOrchestratorError(
        MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
        error.message || "Modeli nuk u gjet.",
        error,
      );
    }

    return initializeRuntime(adapter);
  }

  function getRuntimeStatus(modelId) {
    const normalizedId =
      typeof modelId === "string"
        ? modelId.trim()
        : "";

    if (!normalizedId) {
      throw new TypeError(
        "modelId duhet të jetë tekst i vlefshëm.",
      );
    }

    const runtime = runtimes.get(normalizedId);

    return runtime ? runtime.getStatus() : null;
  }

  function listRuntimeStatuses() {
    return Array.from(runtimes.entries()).map(
      ([adapterId, runtime]) => ({
        adapterId,
        ...runtime.getStatus(),
      }),
    );
  }

  async function close() {
    if (closePromise) {
      return closePromise;
    }

    if (closed) {
      return {
        success: true,
        closed: true,
        runtimesClosed: 0,
      };
    }

    closed = true;

    closePromise = (async () => {
      const runtimeEntries = Array.from(runtimes.entries());

      const results = await Promise.allSettled(
        runtimeEntries.map(([, runtime]) => runtime.close()),
      );

      runtimes.clear();
      initializationPromises.clear();

      const failures = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);

      return {
        success: failures.length === 0,
        closed: true,
        runtimesClosed: runtimeEntries.length,
        failures,
      };
    })();

    return closePromise;
  }

  function getStatus() {
    return {
      version: MODEL_ORCHESTRATOR_VERSION,
      closed,
      registeredModels: registry.list().length,
      activeRuntimes: runtimes.size,
      defaultModelId,
    };
  }

  return Object.freeze({
    initialize,
    generate,
    getRuntimeStatus,
    listRuntimeStatuses,
    getStatus,
    close,
  });
}
