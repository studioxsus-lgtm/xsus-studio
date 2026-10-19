
import { normalizeForSearch, normalizeLanguageCode } from '../language/normalization.js';

import { searchAlbanianKnowledge } from './sq-knowledge.js';
import { searchEnglishKnowledge } from './en-knowledge.js';
import { searchFrenchKnowledge } from './fr-knowledge.js';
import { searchJavaScriptKnowledge } from './javascript-master-knowledge.js';

const knowledgeSources = new Map();

export function registerKnowledgeSource(name, provider) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Emri i burimit duhet të jetë tekst.');
  }

  if (typeof provider !== 'function') {
    throw new TypeError('Burimi duhet të jetë funksion.');
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

export function listKnowledgeSources() {
  return [...knowledgeSources.keys()];
}

export function hasKnowledgeSource(name) {
  return typeof name === 'string' && knowledgeSources.has(name.trim());
}

export function unregisterKnowledgeSource(name) {
  return typeof name === 'string' &&
    knowledgeSources.delete(name.trim());
}

function getBuiltInResults(query, language, limit) {
  const baseLanguage = language === 'auto'
    ? 'auto'
    : language.split('-')[0].toLowerCase();

  const results = [];

  // Në gjuhën auto kërkojmë në të gjitha bazat.
  if (baseLanguage === 'auto' || baseLanguage === 'sq') {
    results.push(...searchAlbanianKnowledge(query, { limit }));
  }

  if (baseLanguage === 'auto' || baseLanguage === 'en') {
    results.push(...searchEnglishKnowledge(query, { limit }));
  }

  if (baseLanguage === 'auto' || baseLanguage === 'fr') {
    results.push(...searchFrenchKnowledge(query, { limit }));
  }

  // Njohuritë JavaScript mund të përdoren në çdo gjuhë.
  results.push(...searchJavaScriptKnowledge(query, { limit }));

  return results;
}

export async function searchKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return {
      success: false,
      query: '',
      results: [],
      sources: [],
      errors: [],
      error: 'Shkruaj një pyetje për të kërkuar njohuri.'
    };
  }

  const language = normalizeLanguageCode(options.language || 'auto');

  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 50))
    : 10;

  const results = getBuiltInResults(
    normalizedQuery,
    language,
    limit
  );

  const errors = [];

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
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
            source: sourceName
          });
        } else if (
          item &&
          typeof item.content === 'string' &&
          item.content.trim()
        ) {
          results.push({
            ...item,
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

  const uniqueResults = [];
  const seen = new Set();

  for (const item of results) {
    const key = normalizeForSearch(
      `${item.title || ''} ${item.content || ''}`
    );

    if (key && !seen.has(key)) {
      seen.add(key);
      uniqueResults.push(item);
    }
  }

  const finalResults = uniqueResults.slice(0, limit);

  return {
    success: true,
    query: normalizedQuery,
    language,
    results: finalResults,
    sources: [...new Set(finalResults.map(item => item.source).filter(Boolean))],
    errors,
    metadata: {
      engine: 'xsus-knowledge-service',
      builtInLanguages: ['sq', 'en', 'fr'],
      registeredSources: knowledgeSources.size,
      resultCount: finalResults.length
    }
  };
}
