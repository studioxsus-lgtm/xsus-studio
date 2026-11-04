
/**
 * XSUS App — XSUS AI Core Adapter
 * Version: 1.0.0
 *
 * Integron XSUS App me XSUS AI Core ekzistues.
 *
 * Parimet:
 * - Nuk kopjon ose ndryshon XSUS AI Core.
 * - Përdor API-në publike processAIRequest().
 * - Ruajnë identitetin dhe versionin e Core-it.
 * - Përçon kontekstin e projektit te Core-i.
 * - Standardizon gabimet e adapter-it.
 */

import {
  processAIRequest,
  AI_CORE_VERSION
} from "../../../src/core/ai-core.js";

export const XSUS_AI_CORE_ADAPTER_VERSION = "1.0.0";

export const XSUS_AI_CORE_ADAPTER_ERROR_CODES =
  Object.freeze({
    INVALID_INPUT: "INVALID_INPUT",
    INVALID_CORE: "INVALID_CORE",
    CORE_ERROR: "CORE_ERROR"
  });

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

function createError(code, message) {
  return {
    success: false,
    error: {
      code,
      message
    },
    metadata: {
      adapter: "xsus-ai-core-adapter",
      adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION,
      coreVersion: AI_CORE_VERSION
    }
  };
}

function normalizeRequest(input) {
  const query =
    typeof input.query === "string"
      ? input.query
      : typeof input.message === "string"
        ? input.message
        : typeof input.prompt === "string"
          ? input.prompt
          : "";

  if (!query.trim()) {
    return null;
  }

  const context = isPlainObject(input.context)
    ? { ...input.context }
    : {};

  const metadata = isPlainObject(input.metadata)
    ? { ...input.metadata }
    : {};

  return {
    ...input,
    query: query.trim(),
    context: {
      ...context,
      sourceProduct: "xsus-app"
    },
    metadata: {
      ...metadata,
      sourceProduct: "xsus-app",
      integrationAdapter: XSUS_AI_CORE_ADAPTER_VERSION
    }
  };
}

/**
 * Creates an adapter for the existing XSUS AI Core.
 *
 * A custom process function can be injected for testing.
 */
export function createXsusAICoreAdapter(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "Opsionet e adapter-it duhet të jenë objekt."
    );
  }

  const coreProcess =
    options.processRequest ?? processAIRequest;

  if (typeof coreProcess !== "function") {
    throw new TypeError(
      "XSUS AI Core duhet të ofrojë processAIRequest."
    );
  }

  async function processRequest(input = {}) {
    if (!isPlainObject(input)) {
      return createError(
        XSUS_AI_CORE_ADAPTER_ERROR_CODES.INVALID_INPUT,
        "Kërkesa e XSUS App nuk është e vlefshme."
      );
    }

    const normalized = normalizeRequest(input);

    if (!normalized) {
      return createError(
        XSUS_AI_CORE_ADAPTER_ERROR_CODES.INVALID_INPUT,
        "Kërkesa duhet të përmbajë query, message ose prompt."
      );
    }

    try {
      const response = await coreProcess(normalized);

      if (
        !isPlainObject(response) ||
        typeof response.success !== "boolean"
      ) {
        return createError(
          XSUS_AI_CORE_ADAPTER_ERROR_CODES.INVALID_CORE,
          "XSUS AI Core ktheu një përgjigje të pavlefshme."
        );
      }

      return {
        ...response,
        integration: {
          adapter: "xsus-ai-core-adapter",
          adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION,
          core: "xsus-ai-core",
          coreVersion: AI_CORE_VERSION
        }
      };
    } catch {
      return createError(
        XSUS_AI_CORE_ADAPTER_ERROR_CODES.CORE_ERROR,
        "Ndodhi një gabim gjatë komunikimit me XSUS AI Core."
      );
    }
  }

  return Object.freeze({
    processRequest,

    getCapabilities() {
      return Object.freeze({
        adapter: "xsus-ai-core-adapter",
        adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION,
        core: "xsus-ai-core",
        coreVersion: AI_CORE_VERSION,
        operations: ["processRequest"],
        features: [
          "request-processing",
          "conversation-context",
          "memory-aware-processing",
          "knowledge-retrieval",
          "hyper-xsus-core-knowledge-routing"
        ]
      });
    }
  });
}

export function getXsusAICoreAdapterCapabilities() {
  return Object.freeze({
    adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION,
    coreVersion: AI_CORE_VERSION,
    operations: ["processRequest"]
  });
}
