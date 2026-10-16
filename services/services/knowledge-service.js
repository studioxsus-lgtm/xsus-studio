// services/knowledge-service.js
import { getAlbanianKeywords, normalizeQueryText } from './language-engine.js';
import { SQ_KNOWLEDGE } from './sq-knowledge.js';
import { EN_KNOWLEDGE } from './en-knowledge.js';
import { FR_KNOWLEDGE } from './fr-knowledge.js';

// Bashkimi i të gjitha bazave të njohurive sipas gjuhëve
export const KNOWLEDGE_BASE = [
  ...(Array.isArray(SQ_KNOWLEDGE) ? SQ_KNOWLEDGE : []),
  ...(Array.isArray(EN_KNOWLEDGE) ? EN_KNOWLEDGE : []),
  ...(Array.isArray(FR_KNOWLEDGE) ? FR_KNOWLEDGE : [])
];

export function searchKnowledge(query = "", language = "sq", limit = 4) {
  if (!query || !query.trim()) return [];

  const terms = getAlbanianKeywords(query);
  const cleanQuery = normalizeQueryText(query);

  // Nëse nuk nxirren dot fjalë kyçe të veçanta, përdorim vetë fjalët e pastruara të pyetjes
  const searchTerms = terms.length > 0 ? terms : cleanQuery.split(" ");

  return KNOWLEDGE_BASE
    .filter((doc) => doc.language === language || !doc.language)
    .map((doc) => {
      const searchable = [
        doc.title || "",
        doc.content || "",
        ...(Array.isArray(doc.tags) ? doc.tags : [])
      ].join(" ").toLowerCase();

      let score = 0;
      searchTerms.forEach((term) => {
        if (term && searchable.includes(term.toLowerCase())) {
          score += 1;
        }
      });

      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => doc);
}
