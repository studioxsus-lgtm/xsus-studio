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

  try {
    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  } catch {
    return false;
  }
}

function createRuntimeError(
  code,
  message,
  retryable = false,
) {
  const error = new Error(message);

  error.code = code;
  error.retryable = retryable;

  return error;
}

/**
 * Kthen një gabim në kontratën standarde të modelit.
 */
function normalizeError(
  error,
  fallbackCode,
  fallbackMessage,
) {
  const validErrorCodes = Object.values(MODEL_ERROR_CODES);

  const code =
    typeof error?.code === "string" &&
    validErrorCodes.includes(error.code)
      ? error.code
      : fallbackCode;

  return createModelError({
    code,
    message:
      typeof error?.message === "string" &&
      error.message.trim()
        ? error.message
        : fallbackMessage,
    retryable: error?.retryable === true,
  });
}

/**
 * Shndërron gabimin standard në Error për API-n e Runtime.
 */
function toRuntimeError(normalizedError) {
  const details = normalizedError.error;

  return createRuntimeError(
    details.code,
    details.message,
    details.retryable,
  );
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

  if (
    implementation !== undefined &&
    adapter !== undefined
  ) {
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
        MODEL_ERROR_CODES.NOT_INITIALIZED,
        "Model Runtime është mbyllur.",
      );
    }

    if (!selectedImplementation) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.UNAVAILABLE,
        "Nuk është lidhur asnjë implementim real i modelit.",
        true,
      );
    }
  }

  async function initialize() {
    if (state === MODEL_RUNTIME_STATES.CLOSED) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.NOT_INITIALIZED,
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
            modelId:
              selectedImplementation.modelId ?? modelId,
            runtimeVersion: MODEL_RUNTIME_VERSION,
          });
        }

        if (state === MODEL_RUNTIME_STATES.CLOSED) {
          throw createRuntimeError(
            MODEL_ERROR_CODES.NOT_INITIALIZED,
            "Runtime u mbyll gjatë inicializimit.",
          );
        }

        state = MODEL_RUNTIME_STATES.READY;

        return getStatus();
      } catch (error) {
        lastError = normalizeError(
          error,
          MODEL_ERROR_CODES.UNAVAILABLE,
          "Inicializimi i modelit dështoi.",
        );

        if (state !== MODEL_RUNTIME_STATES.CLOSED) {
          state = MODEL_RUNTIME_STATES.ERROR;
        }

        throw toRuntimeError(lastError);
      } finally {
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  }

  async function generate(input) {
    /*
     * Kontrolli ndalon vetëm gjenerimet e reja.
     * Gjenerimet e regjistruara më parë vazhdojnë
     * edhe nëse Runtime kalon në gjendjen CLOSED.
     */
    if (state !== MODEL_RUNTIME_STATES.READY) {
      throw createRuntimeError(
        MODEL_ERROR_CODES.NOT_INITIALIZED,
        "Model Runtime nuk është inicializuar ose është mbyllur.",
      );
    }

    let request;

    try {
      request = createModelRequest(input);
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        MODEL_ERROR_CODES.INVALID_REQUEST,
        "Kërkesa e modelit nuk është e vlefshme.",
      );

      throw toRuntimeError(normalizedError);
    }

    activeGenerations += 1;

    /*
     * Regjistrimi në Set bëhet përpara ekzekutimit
     * të implementimit, edhe në rast të një gabimi sinkron.
     */
    const generationPromise = Promise.resolve().then(
      async () => {
        try {
          let rawResponse;

          /*
           * Gabimet e implementimit klasifikohen
           * si INFERENCE_FAILED.
           */
          try {
            rawResponse =
              await selectedImplementation.generate(request);
          } catch (error) {
            lastError = normalizeError(
              error,
              MODEL_ERROR_CODES.INFERENCE_FAILED,
              "Gjenerimi i përgjigjes nga modeli dështoi.",
            );

            throw toRuntimeError(lastError);
          }

          /*
           * Nuk ndërpritet përgjigjja nëse Runtime është
           * mbyllur ndërkohë. close() pret këtë Promise
           * përpara se të mbyllë implementimin.
           */

          /*
           * Gabimet gjatë validimit të përgjigjes
           * klasifikohen si INVALID_RESPONSE.
           */
          try {
            return createModelResponse({
              ...rawResponse,
              requestId:
                rawResponse?.requestId ?? request.requestId,
              conversationId:
                rawResponse?.conversationId ??
                request.conversationId,
              modelId:
                rawResponse?.modelId ??
                selectedImplementation.modelId ??
                modelId,
              language:
                rawResponse?.language ?? request.language,
            });
          } catch (error) {
            lastError = normalizeError(
              error,
              MODEL_ERROR_CODES.INVALID_RESPONSE,
              "Modeli ktheu një përgjigje të pavlefshme.",
            );

            throw toRuntimeError(lastError);
          }
        } finally {
          activeGenerations -= 1;
          activeGenerationPromises.delete(generationPromise);
        }
      },
    );

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

    /*
     * Shënohet menjëherë si CLOSED për të ndaluar
     * kërkesat dhe inicializimet e reja.
     */
    state = MODEL_RUNTIME_STATES.CLOSED;

    closePromise = (async () => {
      if (initializationPromise) {
        try {
          await initializationPromise;
        } catch {
          // Inicializimi mund të dështojë gjatë mbylljes.
        }
      }

      /*
       * Prit përfundimin e të gjitha gjenerimeve aktive.
       */
      await Promise.allSettled([
        ...activeGenerationPromises,
      ]);

      if (
        selectedImplementation &&
        typeof selectedImplementation.close === "function"
      ) {
        await selectedImplementation.close({
          modelId:
            selectedImplementation.modelId ?? modelId,
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
      modelId:
        selectedImplementation?.modelId ?? modelId,
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
