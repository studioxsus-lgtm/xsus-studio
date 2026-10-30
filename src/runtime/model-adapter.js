/**
 * XSUS AI Core — Model Adapter
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përcakton ndërfaqen e përbashkët për modelet.
 * - Lejon lidhjen e modeleve të ndryshme pa ndryshuar AI Core.
 * - Mbështet inicializimin, gjenerimin dhe mbylljen.
 * - Përgatit arkitekturën për ekzekutim lokal dhe offline.
 *
 * Shënim:
 * Ky adapter nuk përmban vetë një model AI.
 */

export const MODEL_ADAPTER_VERSION = "1.0.0";

export const MODEL_ADAPTER_TYPES = Object.freeze({
  LOCAL: "local",
  REMOTE: "remote",
  CUSTOM: "custom",
});

export function createModelAdapter(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Konfigurimi i model adapter duhet të jetë objekt.",
    );
  }

  const {
    id,
    type = MODEL_ADAPTER_TYPES.CUSTOM,
    modelId,
    initialize,
    generate,
    close,
    getStatus,
  } = options;

  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError(
      "Model adapter duhet të ketë një identifikues të vlefshëm.",
    );
  }

  if (typeof modelId !== "string" || modelId.trim().length === 0) {
    throw new TypeError(
      "Model adapter duhet të ketë një modelId të vlefshëm.",
    );
  }

  if (
    !Object.values(MODEL_ADAPTER_TYPES).includes(type)
  ) {
    throw new TypeError(
      `Lloji i model adapter nuk mbështetet: ${String(type)}`,
    );
  }

  if (typeof generate !== "function") {
    throw new TypeError(
      "Model adapter duhet të implementojë funksionin generate().",
    );
  }

  if (
    initialize !== undefined &&
    typeof initialize !== "function"
  ) {
    throw new TypeError(
      "initialize duhet të jetë funksion.",
    );
  }

  if (
    close !== undefined &&
    typeof close !== "function"
  ) {
    throw new TypeError(
      "close duhet të jetë funksion.",
    );
  }

  if (
    getStatus !== undefined &&
    typeof getStatus !== "function"
  ) {
    throw new TypeError(
      "getStatus duhet të jetë funksion.",
    );
  }

  const adapter = {
    id: id.trim(),
    type,
    modelId: modelId.trim(),
    version: MODEL_ADAPTER_VERSION,

    async initialize(context = {}) {
      if (initialize) {
        return initialize(context);
      }

      return {
        success: true,
        initialized: true,
        adapterId: id.trim(),
      };
    },

    async generate(request) {
      if (
        request === null ||
        typeof request !== "object" ||
        Array.isArray(request)
      ) {
        throw new TypeError(
          "Kërkesa për modelin duhet të jetë objekt.",
        );
      }

      return generate(request);
    },

    async close(context = {}) {
      if (close) {
        return close(context);
      }

      return {
        success: true,
        closed: true,
        adapterId: id.trim(),
      };
    },

    async getStatus() {
      if (getStatus) {
        const status = await getStatus();

        if (
          status === null ||
          typeof status !== "object" ||
          Array.isArray(status)
        ) {
          throw new TypeError(
            "Statusi i adapter-it duhet të jetë objekt.",
          );
        }

        return {
          ...status,
          adapterId: id.trim(),
          adapterType: type,
          modelId: modelId.trim(),
          adapterVersion: MODEL_ADAPTER_VERSION,
        };
      }

      return {
        adapterId: id.trim(),
        adapterType: type,
        modelId: modelId.trim(),
        adapterVersion: MODEL_ADAPTER_VERSION,
        available: true,
      };
    },
  };

  return Object.freeze(adapter);
}
