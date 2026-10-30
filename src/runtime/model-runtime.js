/**
 * XSUS AI Core — Model Runtime
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Menaxhimi i ciklit të jetës së modelit.
 * - Inicializimi dhe mbyllja e implementimit.
 * - Validimi i kërkesave dhe përgjigjeve.
 * - Kontrolli i gjendjes së Runtime.
 * - Standardizimi i gabimeve.
 *
 * Runtime nuk është model gjenerues.
 * Gjenerimi kryhet vetëm nga një implementim real
 * i lidhur përmes adapter-it.
 */

import {
  createModelRequest,
  createModelResponse,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
} from "./model-contracts.js";

export const MODEL_RUNTIME_VERSION = "1.0.0";

function createRuntimeError(code, message, retryable = false) {
  const error = new Error(message);

  error.code = code;
  error.retryable = retryable;

  return error;
}

function normalizeModelImplementation(implementation) {
  if (
    implementation === null ||
    typeof implementation !== "object" ||
    Array.isArray(implementation)
  ) {
    throw new TypeError(
      "Implementimi i modelit duhet të jetë objekt i vlefshëm.",
    );
  }

  if (typeof implementation.generate !== "function") {
    throw new TypeError(
      "Implementimi i modelit duhet të ketë metodën generate().",
    );
  }

  for (const method of ["initialize", "close"]) {
    if (
      implementation[method] !== undefined &&
      typeof implementation[method] !== "function"
    ) {
      throw new TypeError(
        `Metoda ${method} duhet të jetë funksion.`,
      );
    }
  }

  return implementation;
}

function normalizeModelId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      "modelId duhet të jetë tekst jo bosh.",
    );
  }

  return value.trim();
}

function isAbortSignal(value) {
  return (
    typeof AbortSignal !== "undefined" &&
    value instanceof AbortSignal
  );
}

export function createModelRuntime(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Konfigurimi i Runtime duhet të jetë objekt.",
    );
  }

  const {
    implementation = null,
    modelId = "xsus-local-model",
  } = options;

  const normalizedModelId = normalizeModelId(modelId);

  let modelImplementation = null;
  let state = MODEL_RUNTIME_STATES.IDLE;
  let initializationPromise = null;
  let activeGenerations = 0;
  let closePromise = null;

  function getState() {
    return state;
  }

  function getStatus() {
    return Object.freeze({
      version: MODEL_RUNTIME_VERSION,
      modelId: normalizedModelId,
      state,
      initialized: state === MODEL_RUNTIME_STATES.READY,
      available: modelImplementation !== null &&
        state !== MODEL_RUNTIME_STATES.CLOSED,
      activeGenerations,
    });
  }

  async function initialize() {
    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.UNAVAILABLE,
        "Runtime është mbyllur dhe nuk mund të inicializohet përsëri.",
      );
    }

    if (state === MODEL_RUNTIME_STATES.READY) {
      return getStatus();
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    if (!modelImplementation) {
      if (!implementation) {
        state = MODEL_RUNTIME_STATES.ERROR;

        throw createRuntimeError(
          MODEL_ERROR_CODES.UNAVAILABLE,
          "Nuk është lidhur asnjë implementim real i modelit.",
          true,
        );
      }

      try {
        modelImplementation =
          normalizeModelImplementation(implementation);
      } catch (error) {
        state = MODEL_RUNTIME_STATES.ERROR;
        throw error;
      }
    }

    state = MODEL_RUNTIME_STATES.INITIALIZING;

    initializationPromise = (async () => {
      try {
        if (typeof modelImplementation.initialize === "function") {
          await modelImplementation.initialize({
            modelId: normalizedModelId,
          });
        }

        if (state === MODEL_RUNTIME_STATES.CLOSED) {
          throw createRuntimeError(
            MODEL_ERROR_CODES.UNAVAILABLE,
            "Runtime u mbyll gjatë inicializimit.",
          );
        }

        state = MODEL_RUNTIME_STATES.READY;

        return getStatus();
      } catch (error) {
        if (state !== MODEL_RUNTIME_STATES.CLOSED) {
          state = MODEL_RUNTIME_STATES.ERROR;
        }

        throw error;
      } finally {
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  }

  async function generate(input = {}) {
    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.UNAVAILABLE,
        "Runtime është mbyllur.",
      );
    }

    if (state !== MODEL_RUNTIME_STATES.READY) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.NOT_INITIALIZED,
        "Runtime duhet të inicializohet para gjenerimit.",
        true,
      );
    }

    const request = createModelRequest(input);

    if (request.signal !== undefined) {
      throw new TypeError(
        "Vendose sinjalin AbortSignal jashtë objektit të kërkesës së modelit.",
      );
    }

    activeGenerations += 1;

    try {
      const rawResponse = await modelImplementation.generate({
        ...request,
        modelId: request.modelId ?? normalizedModelId,
      });

      if (state === MODEL_RUNTIME_STATES.CLOSED) {
        throw createRuntimeError(
          MODEL_ERROR_CODES.UNAVAILABLE,
          "Runtime u mbyll gjatë gjenerimit.",
        );
      }

      if (
        rawResponse === null ||
        typeof rawResponse !== "object" ||
        Array.isArray(rawResponse)
      ) {
        throw createRuntimeError(
          MODEL_ERROR_CODES.INVALID_RESPONSE,
          "Modeli ktheu një përgjigje me format të pavlefshëm.",
        );
      }

      return createModelResponse({
        ...rawResponse,
        requestId: rawResponse.requestId ?? request.requestId,
        conversationId:
          rawResponse.conversationId ?? request.conversationId,
        language: rawResponse.language ?? request.language,
        modelId: rawResponse.modelId ?? normalizedModelId,
      });
    } catch (error) {
      if (error?.code) {
        throw error;
      }

      throw createRuntimeError(
        MODEL_ERROR_CODES.INFERENCE_FAILED,
        error instanceof Error && error.message.trim()
          ? error.message
          : "Gjenerimi i përgjigjes së modelit dështoi.",
        true,
      );
    } finally {
      activeGenerations -= 1;
    }
  }

  async function close() {
    if (closePromise) {
      return closePromise;
    }

    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      return getStatus();
    }

    state = MODEL_RUNTIME_STATES.CLOSED;

    closePromise = (async () => {
      try {
        if (
          modelImplementation &&
          typeof modelImplementation.close === "function"
        ) {
          await modelImplementation.close();
        }

        return getStatus();
      } finally {
        initializationPromise = null;
      }
    })();

    return closePromise;
  }

  if (implementation !== null) {
    modelImplementation =
      normalizeModelImplementation(implementation);
  }

  return Object.freeze({
    initialize,
    generate,
    close,
    getState,
    getStatus,
  });
}
