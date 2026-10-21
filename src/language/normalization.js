/**
 * XSUS AI — Text & Language Normalization
 * Version: 1.1.0
 *
 * Normalizim Unicode, tekstesh, token-esh dhe kodeve të gjuhëve.
 */

export const NORMALIZATION_VERSION = "1.1.0";

export const DEFAULT_LANGUAGE = "auto";

/**
 * Normalizon tekstin pa ndryshuar kuptimin e tij.
 */
export function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFC")
    .replace(/[’‘]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[‐‑‒–—]/gu, "-")
    .replace(/\u00A0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Përgatit tekstin për kërkim dhe krahasim.
 * Ruhet mbështetja për shkronjat Unicode, përfshirë shqipen.
 */
export function normalizeForSearch(value) {
  return normalizeText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Ndërndan tekstin në token-e.
 */
export function tokenizeText(value) {
  const normalized = normalizeForSearch(value);

  if (!normalized) {
    return [];
  }

  return normalized.match(
    /[\p{L}\p{M}\p{N}]+(?:['-][\p{L}\p{M}\p{N}]+)*/gu
  ) || [];
}

/**
 * Normalizon një kod gjuhe sipas standardit të locale-ve.
 * Kodet e pavlefshme kthehen në "auto".
 */
export function normalizeLanguageCode(value) {
  if (typeof value !== "string") {
    return DEFAULT_LANGUAGE;
  }

  const input = value.trim();

  if (!input || input.toLowerCase() === DEFAULT_LANGUAGE) {
    return DEFAULT_LANGUAGE;
  }

  try {
    const locales = Intl.getCanonicalLocales(input);

    return locales[0] || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Kthen kodin bazë të gjuhës.
 * Shembull: "sq-AL" -> "sq".
 */
export function getBaseLanguage(value) {
  const locale = normalizeLanguageCode(value);

  if (locale === DEFAULT_LANGUAGE) {
    return DEFAULT_LANGUAGE;
  }

  return locale.split("-")[0].toLowerCase();
}

/**
 * Krahason dy tekste pas normalizimit.
 */
export function areTextsEqual(first, second) {
  return normalizeForSearch(first) === normalizeForSearch(second);
}

/**
 * Kthen një tekst të normalizuar në listë fjalësh.
 */
export function getUniqueTokens(value) {
  return [...new Set(tokenizeText(value))];
}
