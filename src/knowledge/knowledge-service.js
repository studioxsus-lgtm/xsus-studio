
import {
  normalizeForSearch,
  normalizeLanguageCode,
  getBaseLanguage
} from '../language/normalization.js';

const knowledgeSources = new Map();

/**
 * Regjistron një burim njohurish pa ndryshuar shërbimet ekzistuese.
 */
export function registerKnowledgeSource(name, provider) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Emri i burimit të njohurive është i pavlefshëm.');
  }

  if (typeof provider !== 'function') {
    throw new TypeError('Burimi i njohurive duhet të jetë funksion.');
  }

  const key = name.trim();

  if (knowledgeSources.has(key)) {
    throw new Error(`Burimi "${key}" është regjistruar tashmë.`);
  }

  knowledgeSources.set(key, provider);

  return () => {
    if (knowledgeSources.get(key) === provider) {
      knowledgeSources.delete(key);
    }
  };
}

/**
 * Kërkon njohuri nga të gjithë burimet e regjistruara.
 */
export async function searchKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return {
      success: false,
      query: '',
      results: [],
      sources: [],
      error: 'Shkruaj një pyetje për të kërkuar njohuri.'
    };
  }

  const language = normalizeLanguageCode(
    options.language || 'auto'
  );

  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 50))
    : 10;

  const results = [];
  const errors = [];

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
        baseLanguage: getBaseLanguage(language),
        metadata: options.metadata || {}
      });

      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
          ? response.results
          : [];

      for (const item of items) {
        if (typeof item === 'string' && item.trim()) {
          results.push({
            content: item.trim(),
            source: sourceName,
            language
          });
        } else if (
          item &&
          typeof item === 'object' &&
          typeof item.content === 'string' &&
          item.content.trim()
        ) {
          results.push({
            ...item,
            content: item.content.trim(),
            source: item.source || sourceName
          });
        }
      }
    } catch (error) {
      errors.push({
        source: sourceName,
        error: error instanceof Error
          ? error.message
          : 'Gabim gjatë kërkimit.'
      });
    }
  }

  return {
    success: true,
    query: normalizedQuery,
    language,
    results: results.slice(0, limit),
    sources: [...new Set(results.map(item => item.source))],
    errors,
    metadata: {
      engine: 'xsus-knowledge-service',
      registeredSources: knowledgeSources.size,
      resultCount: Math.min(results.length, limit)
    }
  };
}

/**
 * Kthen emrat e burimeve të regjistruara.
 */
export function listKnowledgeSources() {
  return [...knowledgeSources.keys()];
}

/**
 * Kontrollon nëse ekziston një burim.
 */
export function hasKnowledgeSource(name) {
  return typeof name === 'string' &&
    knowledgeSources.has(name.trim());
}

/**
 * Heq një burim të regjistruar.
 */
export function unregisterKnowledgeSource(name) {
  return typeof name === 'string' &&
    knowledgeSources.delete(name.trim());
}
