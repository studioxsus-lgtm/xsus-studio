const DEFAULT_LANGUAGE = "auto";

export function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeForSearch(value) {
  return normalizeText(value)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function tokenizeText(value) {
  const normalized = normalizeForSearch(value);

  if (!normalized) {
    return [];
  }

  return normalized.match(
    /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu
  ) || [];
}

export function normalizeLanguageCode(value) {
  if (typeof value !== "string") {
    return DEFAULT_LANGUAGE;
  }

  const input = value.trim();

  if (!input || input.toLowerCase() === "auto") {
    return DEFAULT_LANGUAGE;
  }

  try {
    return Intl.getCanonicalLocales(input)[0] || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getBaseLanguage(value) {
  const locale = normalizeLanguageCode(value);

  if (locale === DEFAULT_LANGUAGE) {
    return DEFAULT_LANGUAGE;
  }

  return locale.split("-")[0].toLowerCase();
}
