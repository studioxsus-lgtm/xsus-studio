
/**
 * XSUS AI Core — Knowledge Retrieval Router
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Retrieval përmes Hyper XSUS Core.
 * - Fallback te Knowledge Service ekzistues.
 * - Standardizimi i rezultateve.
 * - Izolimi i gabimeve të retrieval.
 * - Ruajtja e gabimeve origjinale të fallback.
 */

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

function normalizeResults(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (
    isPlainObject(result) &&
    Array.isArray(result.results)
  ) {
    return result.results;
  }

  return [];
}

function normalizeError(error, fallbackMessage) {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (
    isPlainObject(error) &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  return fallbackMessage;
}

function createRetrievalResult({
  results = [],
  source,
  success = true,
  fallbackUsed = false,
  error = null
}) {
  return {
    success,
    results,
    count: results.length,
    source,
    fallbackUsed,
    error
  };
}

export function createKnowledgeRetrievalRouter({
  hyperAdapter = null,
  fallbackSearch = null
} = {}) {
  if (
    hyperAdapter !== null &&
    (
      !isPlainObject(hyperAdapter) ||
      typeof hyperAdapter.retrieve !== "function"
    )
  ) {
    throw new TypeError(
      "Hyper Knowledge Adapter duhet të ofrojë retrieve."
    );
  }

  if (
    fallbackSearch !== null &&
    typeof fallbackSearch !== "function"
  ) {
    throw new TypeError(
      "Fallback Search duhet të jetë funksion."
    );
  }

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "Knowledge Retrieval Router is closed."
      );
    }
  }

  async function retrieve(
    query,
    {
      language = "en",
      limit = 5,
      minimumScore = 0.1,
      metadata = {}
    } = {}
  ) {
    assertOpen();

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      throw new TypeError(
        "Query duhet të jetë tekst jo bosh."
      );
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1
    ) {
      throw new TypeError(
        "Limit duhet të jetë numër i plotë pozitiv."
      );
    }

    if (
      typeof language !== "string" ||
      !language.trim()
    ) {
      throw new TypeError(
        "Language duhet të jetë tekst jo bosh."
      );
    }

    if (
      typeof minimumScore !== "number" ||
      !Number.isFinite(minimumScore) ||
      minimumScore < 0 ||
      minimumScore > 1
    ) {
      throw new TypeError(
        "MinimumScore duhet të jetë numër ndërmjet 0 dhe 1."
      );
    }

    if (!isPlainObject(metadata)) {
      throw new TypeError(
        "Metadata duhet të jetë objekt i vlefshëm."
      );
    }

    let hyperError = null;

    // --------------------------------------------------
    // 1. Primary Retrieval — Hyper XSUS Core
    // --------------------------------------------------

    if (hyperAdapter) {
      try {
        const hyperResult = await hyperAdapter.retrieve(
          query.trim(),
          {
            language,
            limit,
            minimumScore
          }
        );

        if (
          isPlainObject(hyperResult) &&
          hyperResult.success === false
        ) {
          throw new Error(
            "Hyper retrieval returned an unsuccessful result."
          );
        }

        const results = normalizeResults(hyperResult);

        if (results.length > 0) {
          return createRetrievalResult({
            results: results.slice(0, limit),
            source: "hyper-xsus-core",
            success: true,
            fallbackUsed: false,
            error: null
          });
        }
      } catch {
        hyperError = "hyper-retrieval-unavailable";
      }
    }

    // --------------------------------------------------
    // 2. Fallback Retrieval — XSUS Knowledge Service
    // --------------------------------------------------

    if (fallbackSearch) {
      try {
        const fallbackResult = await fallbackSearch(
          query.trim(),
          {
            language,
            limit,
            metadata
          }
        );

        if (
          isPlainObject(fallbackResult) &&
          fallbackResult.success === false
        ) {
          return createRetrievalResult({
            results: [],
            source: "xsus-knowledge-service",
            success: false,
            fallbackUsed: true,
            error: normalizeError(
              fallbackResult.error,
              "fallback-retrieval-failed"
            )
          });
        }

        return createRetrievalResult({
          results: normalizeResults(fallbackResult)
            .slice(0, limit),
          source: "xsus-knowledge-service",
          success: true,
          fallbackUsed: true,
          error: hyperError
        });
      } catch (error) {
        return createRetrievalResult({
          results: [],
          source: "none",
          success: false,
          fallbackUsed: true,
          error: normalizeError(
            error,
            "knowledge-retrieval-failed"
          )
        });
      }
    }

    // --------------------------------------------------
    // 3. No Fallback Available
    // --------------------------------------------------

    return createRetrievalResult({
      results: [],
      source: "none",
      success: hyperError === null,
      fallbackUsed: false,
      error: hyperError
    });
  }

  function getStatus() {
    assertOpen();

    return {
      connected: true,
      hyperAvailable: Boolean(hyperAdapter),
      fallbackAvailable: Boolean(fallbackSearch),
      version: "1.0.0"
    };
  }

  function close() {
    if (closed) {
      return;
    }

    closed = true;
  }

  return Object.freeze({
    retrieve,
    getStatus,
    close
  });
}
