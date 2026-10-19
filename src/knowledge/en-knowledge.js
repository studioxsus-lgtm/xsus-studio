
import { normalizeForSearch } from '../language/normalization.js';

export const EN_KNOWLEDGE = [
  {
    id: 'en-ai',
    title: 'Artificial Intelligence',
    keywords: ['artificial intelligence', 'ai', 'machine learning', 'model'],
    content:
      'Artificial intelligence develops systems that perform tasks such as ' +
      'language processing, pattern recognition, and content generation. ' +
      'Results should be evaluated for accuracy.'
  },
  {
    id: 'en-programming',
    title: 'Programming',
    keywords: ['programming', 'coding', 'code', 'algorithm'],
    content:
      'Programming is the process of writing instructions that a computer ' +
      'can execute. Good code should be readable, testable, and maintainable.'
  },
  {
    id: 'en-javascript',
    title: 'JavaScript',
    keywords: ['javascript', 'js', 'function', 'variable', 'promise'],
    content:
      'JavaScript is a programming language used in browsers and server ' +
      'environments. It supports functions, objects, modules, and asynchronous programming.'
  },
  {
    id: 'en-web',
    title: 'Web Development',
    keywords: ['web', 'website', 'html', 'css', 'react', 'next.js'],
    content:
      'HTML defines page structure, CSS controls presentation, and JavaScript ' +
      'adds interactivity. React and Next.js help developers build web applications.'
  },
  {
    id: 'en-security',
    title: 'Digital Security',
    keywords: ['security', 'password', 'privacy', 'protection', 'authentication'],
    content:
      'Digital security protects accounts, systems, and data. Use unique passwords, ' +
      'multi-factor authentication, regular updates, and least-privilege access.'
  },
  {
    id: 'en-learning',
    title: 'Learning',
    keywords: ['learning', 'education', 'study', 'practice', 'teaching'],
    content:
      'Effective learning combines clear explanations, practical exercises, ' +
      'spaced repetition, and regular checks of understanding.'
  },
  {
    id: 'en-xsus',
    title: 'XSUS AI Platform',
    keywords: ['xsus', 'xsus ai', 'xsus studio', 'language engine'],
    content:
      'XSUS AI is being developed with separate modules for the AI core, ' +
      'language processing, knowledge sources, and service registration. ' +
      'New modules should be integrated gradually without disrupting existing services.'
  }
];

export function searchEnglishKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/u);
  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 20))
    : 5;

  return EN_KNOWLEDGE
    .map(entry => {
      const title = normalizeForSearch(entry.title);
      const content = normalizeForSearch(entry.content);
      const keywords = entry.keywords.map(normalizeForSearch);

      let score = 0;

      if (title.includes(normalizedQuery)) score += 8;

      for (const term of terms) {
        if (title.includes(term)) score += 4;
        if (keywords.some(keyword => keyword.includes(term))) score += 3;
        if (content.includes(term)) score += 1;
      }

      return { ...entry, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => ({
      ...entry,
      source: 'en-knowledge'
    }));
}

export function getEnglishKnowledgeById(id) {
  const entry = EN_KNOWLEDGE.find(item => item.id === id);
  return entry ? { ...entry } : null;
}

export function listEnglishKnowledgeTopics() {
  return EN_KNOWLEDGE.map(({ id, title }) => ({ id, title }));
}
