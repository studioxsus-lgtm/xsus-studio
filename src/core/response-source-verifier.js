/**
 * XSUS AI Core — Response Source Verification Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Validimi strukturor i burimeve.
 * - Kontrolli sintaksor i URL-ve HTTP/HTTPS.
 * - Kontrolli i metadata-ve.
 * - Dallimi midis validimit teknik dhe besueshmërisë.
 *
 * Kufizim:
 * Ky modul nuk provon vërtetësinë e përmbajtjes,
 * reputacionin e autorit ose besueshmërinë e faqes.
 */

export const RESPONSE_SOURCE_VERIFIER_VERSION = "1.0.0";

/**
 * Alias për përputhshmëri me XSUS AI Public API.
 * Të dy emrat përfaqësojnë të njëjtin version.
 */
export const SOURCE_VERIFICATION_VERSION =
  RESPONSE_SOURCE_VERIFIER_VERSION;

export const SOURCE_VERIFICATION_STATUSES = Object.freeze({
  INVALID: "invalid",
  UNVERIFIED: "unverified",
  STRUCTURALLY_VALID: "structurally_valid",
});

export const SOURCE_VERIFICATION_ERRORS = Object.freeze({
  INVALID_SOURCE: "INVALID_SOURCE",
  EMPTY_SOURCE: "EMPTY_SOURCE",
  INVALID_URL: "INVALID_URL",
  UNSUPPORTED_URL_PROTOCOL: "UNSUPPORTED_URL_PROTOCOL",
  MISSING_TITLE: "MISSING_TITLE",
  MISSING_CONTENT: "MISSING_CONTENT",
  MISSING_URL: "MISSING_URL",
});

const MAX_SOURCE_TEXT_LENGTH = 50000;

const ALLOWED_URL_PROTOCOLS = new Set([
  "http:",
  "https:",
]);

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

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

function validateUrl(value) {
  const urlText = normalizeText(value);

  if (!urlText) {
    return {
      present: false,
      valid: false,
      protocol: null,
      hostname: null,
      error: SOURCE_VERIFICATION_ERRORS.MISSING_URL,
    };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(urlText);
  } catch {
    return {
      present: true,
      valid: false,
      protocol: null,
      hostname: null,
      error: SOURCE_VERIFICATION_ERRORS.INVALID_URL,
    };
  }

  if (!ALLOWED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      present: true,
      valid: false,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname || null,
      error:
        SOURCE_VERIFICATION_ERRORS.UNSUPPORTED_URL_PROTOCOL,
    };
  }

  if (
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return {
      present: true,
      valid: false,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname || null,
      error: SOURCE_VERIFICATION_ERRORS.INVALID_URL,
    };
  }

  return {
    present: true,
    valid: true,
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    error: null,
  };
}

function createResult({
  status,
  valid,
  structurallyValid,
  title,
  content,
  url,
  errors,
}) {
  return Object.freeze({
    version: RESPONSE_SOURCE_VERIFIER_VERSION,
    status,
    valid,
    structurallyValid,
    verified: false,
    trustEstablished: false,
    title,
    contentLength: content.length,
    url: Object.freeze(url),
    errors: Object.freeze([...new Set(errors)]),
  });
}

/**
 * Kontrollon një burim pa pretenduar se vërteton
 * saktësinë e përmbajtjes ose besueshmërinë e autorit.
 *
 * @param {string|object} source
 * @returns {object}
 */
export function verifyResponseSource(source) {
  const errors = [];

  /*
   * Një varg tekstual nuk përmban metadata të plota
   * dhe nuk ka URL për t'u kontrolluar.
   */
  if (typeof source === "string") {
    const content = normalizeText(source);

    if (!content) {
      return createResult({
        status: SOURCE_VERIFICATION_STATUSES.INVALID,
        valid: false,
        structurallyValid: false,
        title: "",
        content: "",
        url: {
          present: false,
          valid: false,
          protocol: null,
          hostname: null,
          error: SOURCE_VERIFICATION_ERRORS.MISSING_URL,
        },
        errors: [
          SOURCE_VERIFICATION_ERRORS.EMPTY_SOURCE,
        ],
      });
    }

    const withinLengthLimit =
      content.length <= MAX_SOURCE_TEXT_LENGTH;

    if (!withinLengthLimit) {
      errors.push(
        SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE,
      );
    }

    errors.push(
      SOURCE_VERIFICATION_ERRORS.MISSING_URL,
    );

    return createResult({
      status: SOURCE_VERIFICATION_STATUSES.UNVERIFIED,
      valid: false,
      structurallyValid: withinLengthLimit,
      title: "",
      content,
      url: {
        present: false,
        valid: false,
        protocol: null,
        hostname: null,
        error: SOURCE_VERIFICATION_ERRORS.MISSING_URL,
      },
      errors,
    });
  }

  /*
   * Pranohen vetëm objektet e thjeshta.
   */
  if (!isPlainObject(source)) {
    return createResult({
      status: SOURCE_VERIFICATION_STATUSES.INVALID,
      valid: false,
      structurallyValid: false,
      title: "",
      content: "",
      url: {
        present: false,
        valid: false,
        protocol: null,
        hostname: null,
        error: SOURCE_VERIFICATION_ERRORS.MISSING_URL,
      },
      errors: [
        SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE,
      ],
    });
  }

  const title = normalizeText(source.title);
  const content = normalizeText(source.content);
  const url = validateUrl(source.url);

  if (!title) {
    errors.push(
      SOURCE_VERIFICATION_ERRORS.MISSING_TITLE,
    );
  }

  if (!content) {
    errors.push(
      SOURCE_VERIFICATION_ERRORS.MISSING_CONTENT,
    );
  }

  const withinLengthLimit =
    content.length <= MAX_SOURCE_TEXT_LENGTH;

  if (!withinLengthLimit) {
    errors.push(
      SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE,
    );
  }

  if (url.error) {
    errors.push(url.error);
  }

  const structurallyValid =
    title.length > 0 &&
    content.length > 0 &&
    withinLengthLimit;

  const valid =
    structurallyValid &&
    url.valid &&
    errors.length === 0;

  let status;

  if (!structurallyValid) {
    status = SOURCE_VERIFICATION_STATUSES.INVALID;
  } else if (valid) {
    status =
      SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID;
  } else {
    status = SOURCE_VERIFICATION_STATUSES.UNVERIFIED;
  }

  return createResult({
    status,
    valid,
    structurallyValid,
    title,
    content,
    url,
    errors,
  });
}

/**
 * Kontrollon një koleksion burimesh.
 *
 * Çdo burim merr rezultatin e vet.
 * Prania e një URL-je nuk provon besueshmërinë.
 *
 * @param {Array} sources
 * @returns {object}
 */
export function verifyResponseSources(sources) {
  if (!Array.isArray(sources)) {
    throw new TypeError(
      "Burimet duhet të jenë një varg.",
    );
  }

  const results = sources.map((source) =>
    verifyResponseSource(source)
  );

  const validCount = results.filter(
    (result) => result.valid
  ).length;

  const structurallyValidCount = results.filter(
    (result) => result.structurallyValid
  ).length;

  const invalidCount = results.filter(
    (result) =>
      result.status ===
      SOURCE_VERIFICATION_STATUSES.INVALID
  ).length;

  const unverifiedCount = results.filter(
    (result) =>
      result.status ===
      SOURCE_VERIFICATION_STATUSES.UNVERIFIED
  ).length;

  return Object.freeze({
    version: RESPONSE_SOURCE_VERIFIER_VERSION,
    total: results.length,
    validCount,
    structurallyValidCount,
    invalidCount,
    unverifiedCount,
    verifiedCount: 0,
    trustEstablishedCount: 0,
    results: Object.freeze(results),
  });
}
