
import { getAlbanianKeywords, normalizeQueryText } from './language-engine.js';

import { SQ_KNOWLEDGE } from './sq-knowledge.js';
import { EN_KNOWLEDGE } from './en-knowledge.js';
import { FR_KNOWLEDGE } from './fr-knowledge.js';

import javascriptMasterKnowledge from './javascript-master-knowledge.js';

function formatTopicName(topicKey = '') {
  return String(topicKey)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function buildJavaScriptKnowledge(masterKnowledge) {
  if (!masterKnowledge || typeof masterKnowledge !== 'object') {
    return [];
  }

  const documents = [];

  for (const [sectionKey, section] of Object.entries(masterKnowledge)) {
    if (!section || typeof section !== 'object') continue;

    const titles = section.title || {};
    const topics = section.topics || {};
    const topicEntries = Object.entries(topics);

    for (const language of ['sq', 'en']) {
      const sectionTitle = titles[language] || formatTopicName(sectionKey);

      for (const [topicKey, localizedTopic] of topicEntries) {
        const content =
          typeof localizedTopic === 'string'
            ? localizedTopic
            : localizedTopic?.[language];

        if (typeof content !== 'string' || !content.trim()) {
          continue;
        }

        documents.push({
          id: `javascript-${sectionKey}-${topicKey}-${language}`,
          title: `${sectionTitle} — ${formatTopicName(topicKey)}`,
          content,
          tags: [
            'javascript',
            'JavaScript',
            sectionKey,
            topicKey,
            sectionTitle,
            formatTopicName(topicKey)
          ],
          language,
          source: 'javascript-master-knowledge'
        });
      }

      if (
        typeof section.example === 'string' &&
        section.example.trim()
      ) {
        documents.push({
          id: `javascript-${sectionKey}-example-${language}`,
          title: `${sectionTitle} — ${
            language === 'sq' ? 'Shembull kodi' : 'Code example'
          }`,
          content: section.example,
          tags: [
            'javascript',
            'code',
            'example',
            sectionKey,
            sectionTitle
          ],
          language,
          source: 'javascript-master-knowledge'
        });
      }
    }
  }

  return documents;
}

const JAVASCRIPT_KNOWLEDGE = buildJavaScriptKnowledge(
  javascriptMasterKnowledge
);

export const KNOWLEDGE_BASE = [
  ...(Array.isArray(SQ_KNOWLEDGE) ? SQ_KNOWLEDGE : []),
  ...(Array.isArray(EN_KNOWLEDGE) ? EN_KNOWLEDGE : []),
  ...(Array.isArray(FR_KNOWLEDGE) ? FR_KNOWLEDGE : []),
  ...JAVASCRIPT_KNOWLEDGE
];

function normalizeText(value = '') {
  try {
    return normalizeQueryText(String(value)).toLowerCase().trim();
  } catch {
    return String(value).toLowerCase().trim();
  }
}

export function searchKnowledge(query = '', language = 'sq', limit = 4) {
  if (typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = normalizeText(query);

  if (!cleanQuery) return [];

  let extractedTerms = [];

  try {
    const keywords = getAlbanianKeywords(query);

    if (Array.isArray(keywords)) {
      extractedTerms = keywords;
    }
  } catch {
    // Vazhdon me fjalët e nxjerra nga pyetja.
  }

  const searchTerms = [
    ...new Set(
      [...extractedTerms, ...cleanQuery.split(/\s+/)]
        .map((term) => normalizeText(term))
        .filter((term) => term.length > 1)
    )
  ];

  if (searchTerms.length === 0) return [];

  const requestedLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(50, Math.floor(Number(limit))))
    : 4;

  const requestedLanguage =
    typeof language === 'string' ? language.toLowerCase() : 'sq';

  const results = KNOWLEDGE_BASE
    .filter((doc) => {
      if (!doc || typeof doc !== 'object') return false;

      // Në modalitetin auto lejojmë kërkim në të gjitha gjuhët.
      if (requestedLanguage === 'auto') return true;

      return (
        doc.language === requestedLanguage ||
        !doc.language
      );
    })
    .map((doc) => {
      const title = normalizeText(doc.title || '');
      const content = normalizeText(doc.content || '');
      const tags = Array.isArray(doc.tags) ? doc.tags : [];

      const normalizedTags = tags.map(normalizeText).join(' ');

      let score = 0;

      for (const term of searchTerms) {
        if (!term) continue;

        if (title.includes(term)) score += 4;
        if (normalizedTags.includes(term)) score += 2;
        if (content.includes(term)) score += 1;
      }

      if (title && title.includes(cleanQuery)) {
        score += 6;
      }

      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return results
    .slice(0, requestedLimit)
    .map(({ doc }) => doc);
}

export function getKnowledgeStats() {
  return {
    totalDocuments: KNOWLEDGE_BASE.length,
    javascriptDocuments: JAVASCRIPT_KNOWLEDGE.length,
    languages: [
      ...new Set(
        KNOWLEDGE_BASE
          .map((doc) => doc.language)
          .filter(Boolean)
      )
    ]
  };
}
