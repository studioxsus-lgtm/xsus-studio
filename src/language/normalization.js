
/**
 * XSUS AI — International Text Normalization
 * Mbështet shkrime dhe kode gjuhësore ndërkombëtare.
 */

export function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForSearch(value) {
  return normalizeText(value)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeText(value) {
  const normalized = normalizeForSearch(value);

  if (!normalized) {
    return [];
  }

  return normalized.split(/\s+/u);
}

export function normalizeLanguageCode(value) {
  if (typeof value !== 'string') {
    return 'auto';
  }

  const code = value.trim();

  if (!code || code.toLowerCase() === 'auto') {
    return 'auto';
  }

  try {
    return Intl.getCanonicalLocales(code)[0] || 'auto';
  } catch {
    return 'auto';
  }
}

export function getBaseLanguage(value) {
  const locale = normalizeLanguageCode(value);

  if (locale === 'auto') {
    return 'auto';
  }

  return locale.split('-')[0].toLowerCase();
}
