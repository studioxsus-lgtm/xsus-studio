/**
 * XSUS App — Hyper XSUS Core Adapter
 * Version: 1.0.0
 *
 * Integrimi ndërmjet XSUS App dhe Hyper XSUS Core.
 *
 * Përgjegjësitë:
 * - Izolimi i XSUS App nga implementimi i Hyper Core.
 * - Kërkimi në KnowledgeGraph.
 * - Zgjerimi i njohurive përmes KnowledgeLinking.
 * - Standardizimi i rezultateve.
 * - Menaxhimi i ciklit të jetës së adapterit.
 */

import {
  createXsusAIKnowledgeAdapter,
  XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
} from "../../../src/hyper-xsus-core/index.js";

export const HYPER_XSUS_APP_ADAPTER_VERSION = "1.0.0";

export const HYPER_XSUS_APP_ERROR_CODES = Object.freeze({
  INVALID_OPTIONS: "INVALID_OPTIONS",
  INVALID_QUERY: "INVALID_QUERY",
  ADAPTER_CLOSED: "ADAPTER_CLOSED",
  RETRIEVAL_FAILED: "RETRIEVAL_FAILED",
});

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function createError(code, message, cause = null) {
  const error = new Error(message);

  error.code = code;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

export function createHyperXsusCoreAdapter(options = {}) {
  if (!isPlainObject(options)) {
    throw createError(
      HYPER_XSUS_APP_ERROR_CODES.INVALID_OPTIONS,
      "Hyper XSUS Core adapter options must be a plain object."
    );
  }

  let hyperAdapter;

  try {
    hyperAdapter = createXsusAIKnowledgeAdapter({
      knowledgeLink: options.knowledgeLink || {},
      knowledgeGraph: options.knowledgeGraph || {},
    });
  } catch (error) {
    throw createError(
      HYPER_XSUS_APP_ERROR_CODES.RETRIEVAL_FAILED,
      "Failed to initialize Hyper XSUS Core.",
      error
    );
  }

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw createError(
        HYPER_XSUS_APP_ERROR_CODES.ADAPTER_CLOSED,
        "Hyper XSUS Core adapter is closed."
      );
    }
  }

  function retrieve(query, retrieveOptions = {}) {
    assertOpen();

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      throw createError(
        HYPER_XSUS_APP_ERROR_CODES.INVALID_QUERY,
        "A non-empty query is required."
      );
    }

    if (!isPlainObject(retrieveOptions)) {
      throw createError(
        HYPER_XSUS_APP_ERROR_CODES.INVALID_OPTIONS,
        "Retrieval options must be a plain object."
      );
    }

    try {
      return hyperAdapter.retrieve(
        query,
        retrieveOptions
      );
    } catch (error) {
      throw createError(
        HYPER_XSUS_APP_ERROR_CODES.RETRIEVAL_FAILED,
        "Hyper XSUS Core retrieval failed.",
        error
      );
    }
  }

  function getStatus() {
    assertOpen();

    return Object.freeze({
      version: HYPER_XSUS_APP_ADAPTER_VERSION,
      connected: true,
      provider: "hyper-xsus-core",
      providerVersion: hyperAdapter.version,
      knowledgeAdapterVersion:
        XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
      capabilities: hyperAdapter.getStatus().capabilities,
    });
  }

  function close() {
    if (closed) {
      return;
    }

    hyperAdapter.close();
    closed = true;
  }

  return Object.freeze({
    version: HYPER_XSUS_APP_ADAPTER_VERSION,
    retrieve,
    getStatus,
    close,
  });
}

export function getHyperXsusCoreAdapterCapabilities() {
  return Object.freeze({
    version: HYPER_XSUS_APP_ADAPTER_VERSION,
    provider: "hyper-xsus-core",
    knowledgeAdapterVersion:
      XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
    capabilities: Object.freeze({
      textRetrieval: true,
      relatedKnowledgeExpansion: true,
      knowledgeGraph: true,
      knowledgeLinking: true,
      semanticEmbeddings: false,
    }),
  });
}
