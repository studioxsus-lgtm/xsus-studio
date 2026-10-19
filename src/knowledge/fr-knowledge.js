
import { normalizeForSearch } from '../language/normalization.js';

export const FR_KNOWLEDGE = [
  {
    id: 'fr-ai',
    title: 'Intelligence artificielle',
    keywords: ['intelligence artificielle', 'ia', 'apprentissage automatique'],
    content:
      "L'intelligence artificielle développe des systèmes capables de traiter " +
      'le langage, de reconnaître des modèles et de générer du contenu. ' +
      'Les résultats doivent être vérifiés.'
  },
  {
    id: 'fr-programming',
    title: 'Programmation',
    keywords: ['programmation', 'code', 'algorithme', 'développement'],
    content:
      'La programmation consiste à écrire des instructions exécutables ' +
      'par un ordinateur. Un bon code doit être lisible, testable et maintenable.'
  },
  {
    id: 'fr-javascript',
    title: 'JavaScript',
    keywords: ['javascript', 'fonction', 'variable', 'promise'],
    content:
      'JavaScript est un langage utilisé dans les navigateurs et les environnements ' +
      'serveur. Il prend en charge les fonctions, les objets, les modules et ' +
      'la programmation asynchrone.'
  },
  {
    id: 'fr-web',
    title: 'Développement web',
    keywords: ['web', 'site internet', 'html', 'css', 'react', 'next.js'],
    content:
      'HTML définit la structure, CSS contrôle la présentation et JavaScript ' +
      "ajoute l'interactivité. React et Next.js facilitent la création d'applications web."
  },
  {
    id: 'fr-security',
    title: 'Sécurité numérique',
    keywords: ['sécurité', 'mot de passe', 'confidentialité', 'protection'],
    content:
      'La sécurité numérique protège les comptes, les systèmes et les données. ' +
      'Utilisez des mots de passe uniques, une authentification multifacteur ' +
      'et des mises à jour régulières.'
  },
  {
    id: 'fr-learning',
    title: 'Apprentissage',
    keywords: ['apprentissage', 'étude', 'éducation', 'pratique'],
    content:
      "L'apprentissage est renforcé par des explications claires, des exercices, " +
      'des révisions régulières et une vérification des connaissances.'
  },
  {
    id: 'fr-xsus',
    title: 'Plateforme XSUS AI',
    keywords: ['xsus', 'xsus ai', 'xsus studio', 'moteur linguistique'],
    content:
      "XSUS AI est développé avec des modules séparés pour le cœur de l'IA, " +
      'le traitement des langues, les bases de connaissances et les services. ' +
      'Les nouveaux modules seront intégrés progressivement.'
  }
];

export function searchFrenchKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/u);
  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 20))
    : 5;

  return FR_KNOWLEDGE
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
      source: 'fr-knowledge'
    }));
}

export function getFrenchKnowledgeById(id) {
  const entry = FR_KNOWLEDGE.find(item => item.id === id);
  return entry ? { ...entry } : null;
}

export function listFrenchKnowledgeTopics() {
  return FR_KNOWLEDGE.map(({ id, title }) => ({ id, title }));
}
