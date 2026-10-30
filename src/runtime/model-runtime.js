/**
 * XSUS AI Core — Model Runtime
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Menaxhon ciklin e jetës së modelit.
 * - Mbështet implementime direkte dhe Model Adapter.
 * - Standardizon kërkesat, përgjigjet dhe gabimet.
 * - Parandalon inicializimin e dyfishtë.
 * - Menaxhon gjenerimet aktive dhe mbylljen.
 *
 * Ky modul nuk përmban vetë një model AI.
 */

import {
  createModelRequest,
  createModelResponse,
  createModelError,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
} from "./model-contracts.js";

export const MODEL_RUNTIME_VERSION = "1.1.0";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function createRuntimeError(code, message, retryable = false) {
  const error = new Error(message);

  error.code = code;
  error.retryable = retryable;

  return error;
}

function normalizeError(error, fallbackCode, fallbackMessage) {
  return createModelError({
    code:
      typeof error?.code === "string"
        ? error.code
        : fallbackCode,
    message:
      typeof error?.message === "string" &&
      error.message.trim()
        ? error.message
        : fallbackMessage,
    retryable: error?.retryable === true,
  });
}

export function createModelRuntime(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "Konfigurimi i Model Runtime duhet të jetë objekt.",
    );
  }

  const {
    modelId = "xsus-local-model",
    implementation,
    adapter,
  } = options;

  if (
    typeof modelId !== "string" ||
    modelId.trim().length === 0
  ) {
    throw new TypeError(
      "Model Runtime duhet të ketë një modelId të vlefshëm.",
    );
  }

  if (implementation !== undefined && adapter !== undefined) {
    throw new TypeError(
      "Përdor implementation ose adapter, jo të dyja njëkohësisht.",
    );
  }

  const selectedImplementation = adapter ?? implementation;

  if (
    selectedImplementation !== undefined &&
    !isPlainObject(selectedImplementation)
  ) {
    throw new TypeError(
      "Implementimi i modelit duhet të jetë objekt.",
    );
  }

  if (
    selectedImplementation !== undefined &&
    typeof selectedImplementation.generate !== "function"
  ) {
    throw new TypeError(
      "Implementimi i modelit duhet të ketë funksionin generate().",
    );
  }

  if (
    selectedImplementation?.initialize !== undefined &&
    typeof selectedImplementation.initialize !== "function"
  ) {
    throw new TypeError(
      "initialize duhet të jetë funksion.",
    );
  }

  if (
    selectedImplementation?.close !== undefined &&
    typeof selectedImplementation.close !== "function"
  ) {
    throw new TypeError(
      "close duhet të jetë funksion.",
    );
  }

  let state = MODEL_RUNTIME_STATES.IDLE;
  let initializationPromise = null;
  let closePromise = null;
  let activeGenerations = 0;
  let lastError = null;

  const activeGenerationPromises = new Set();

  function ensureAvailable() {
    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.MODEL_NOT_INITIALIZED,
        "Model Runtime është mbyllur.",
      );
    }

    if (!selectedImplementation) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.MODEL_UNAVAILABLE,
        "Nuk është lidhur asnjë implementim real i modelit.",
        true,
      );
    }
  }

  async function initialize() {
    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.MODEL_NOT_INITIALIZED,
        "Model Runtime është mbyllur dhe nuk mund të inicializohet.",
      );
    }

    if (state === MODEL_RUNTIME_STATES.READY) {
      return getStatus();
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    ensureAvailable();

    state = MODEL_RUNTIME_STATES.INITIALIZING;
    lastError = null;

    initializationPromise = (async () => {
      try {
        if (
          typeof selectedImplementation.initialize === "function"
        ) {
          await selectedImplementation.initialize({
            modelId: selectedImplementation.modelId ?? modelId,
            runtimeVersion: MODEL_RUNTIME_VERSION,
          });
        }

        if (state === MODEL_RUNTIME_STATES.CLOSED) {
          throw createRuntimeError(
            MODEL_ERROR_CODES.MODEL_NOT_INITIALIZED,
            "Runtime u mbyll gjatë inicializimit.",
          );
        }

        state = MODEL_RUNTIME_STATES.READY;

        return getStatus();
      } catch (error) {
        lastError = normalizeError(
          error,
          MODEL_ERROR_CODES.MODEL_UNAVAILABLE,
          "Inicializimi i modelit dështoi.",
        );

        if (state !== MODEL_RUNTIME_STATES.CLOSED) {
          state = MODEL_RUNTIME_STATES.ERROR;
        }

        throw Object.assign(
          new Error(lastError.message),
          {
            code: lastError.code,
            retryable: lastError.retryable,
          },
        );
      } finally {
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  }

  async function generate(input) {
    if (state !== MODEL_RUNTIME_STATES.READY) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.MODEL_NOT_INITIALIZED,
        "Model Runtime nuk është inicializuar. Thirr initialize() së pari.",
      );
    }

    let request;

    try {
      request = createModelRequest(input);
    } catch (error) {
      throw Object.assign(
        new Error(error.message),
        {
          code: MODEL_ERROR_CODES.MODEL_INVALID_REQUEST,
          retryable: false,
        },
      );
    }

    activeGenerations += 1;

    let generationPromise;

    generationPromise = (async () => {
      try {
        const rawResponse =
          await selectedImplementation.generate(request);

        if (state === MODEL_RUNTIME_STATES.CLOSED) {
          throw createRuntimeError(
            MODEL_ERROR_CODES.MODEL_NOT_INITIALIZED,
            "Runtime u mbyll gjatë gjenerimit.",
          );
        }

        return createModelResponse({
          ...rawResponse,
          requestId: rawResponse?.requestId ?? request.requestId,
          conversationId:
            rawResponse?.conversationId ?? request.conversationId,
          modelId:
            rawResponse?.modelId ??
            selectedImplementation.modelId ??
            modelId,
          language: rawResponse?.language ?? request.language,
        });
      } catch (error) {
        lastError = normalizeError(
          error,
          MODEL_ERROR_CODES.MODEL_INFERENCE_FAILED,
          "Gjenerimi i përgjigjes nga modeli dështoi.",
        );

        throw Object.assign(
          new Error(lastError.message),
          {
            code: lastError.code,
            retryable: lastError.retryable,
          },
        );
      } finally {
        activeGenerations -= 1;
        activeGenerationPromises.delete(generationPromise);
      }
    })();

    activeGenerationPromises.add(generationPromise);

    return generationPromise;
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
      if (initializationPromise) {
        try {
          await initializationPromise;
        } catch {
          // Inicializimi mund të dështojë gjatë mbylljes.
        }
      }

      await Promise.allSettled([
        ...activeGenerationPromises,
      ]);

      if (
        selectedImplementation &&
        typeof selectedImplementation.close === "function"
      ) {
        await selectedImplementation.close({
          modelId: selectedImplementation.modelId ?? modelId,
          runtimeVersion: MODEL_RUNTIME_VERSION,
        });
      }

      return getStatus();
    })();

    return closePromise;
  }

  function getState() {
    return state;
  }

  function getStatus() {
    return {
      version: MODEL_RUNTIME_VERSION,
      modelId: selectedImplementation?.modelId ?? modelId,
      adapterId: selectedImplementation?.id ?? null,
      state,
      initialized: state === MODEL_RUNTIME_STATES.READY,
      available: Boolean(selectedImplementation),
      activeGenerations,
      lastError,
    };
  }

  return Object.freeze({
    initialize,
    generate,
    close,
    getState,
    getStatus,
  });
}
