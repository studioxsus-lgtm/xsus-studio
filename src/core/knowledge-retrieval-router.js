
/**
 * XSUS AI Core — Knowledge Retrieval Router
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Retrieval përmes Hyper XSUS Core.
 * - Fallback te Knowledge Service ekzistues.
 * - Standardizimi i rezultateve.
 * - Izolimi i gabimeve të retrieval.
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

    let hyperError = null;

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

        const results = normalizeResults(hyperResult);

        if (
          isPlainObject(hyperResult) &&
          hyperResult.success === false
        ) {
          throw new Error(
            "Hyper retrieval returned an unsuccessful result."
          );
        }

        if (results.length > 0) {
          return createRetrievalResult({
            results: results.slice(0, limit),
            source: "hyper-xsus-core"
          });
        }
      } catch {
        hyperError = "hyper-retrieval-unavailable";
      }
    }

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
            error: "fallback-retrieval-failed"
          });
        }

        return createRetrievalResult({
          results: normalizeResults(fallbackResult)
            .slice(0, limit),
          source: "xsus-knowledge-service",
          fallbackUsed: true,
          error: hyperError
        });
      } catch {
        return createRetrievalResult({
          results: [],
          source: "none",
          success: false,
          fallbackUsed: true,
          error: "knowledge-retrieval-failed"
        });
      }
    }

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
