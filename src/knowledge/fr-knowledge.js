
/**
 * XSUS AI — Base de connaissances française
 * Version : 1.1.0
 * Langue : français (fr)
 * Domaines : programming, technology, education
 */

import { normalizeForSearch } from "../language/normalization.js";

export const FR_KNOWLEDGE_VERSION = "1.1.0";

export const FR_KNOWLEDGE = [
  {
    id: "fr-ai",
    title: "Intelligence artificielle",
    domain: "technology",
    language: "fr",
    keywords: [
      "intelligence artificielle", "ia", "apprentissage automatique",
      "machine learning", "modèle", "ia générative"
    ],
    content:
      "L'intelligence artificielle développe des systèmes capables de traiter " +
      "le langage, de reconnaître des modèles, de faire des prédictions et de générer du contenu. " +
      "L'apprentissage automatique permet aux systèmes d'apprendre des régularités à partir des données. " +
      "Les résultats doivent être évalués pour leur exactitude, leur fiabilité et leur sécurité."
  },
  {
    id: "fr-programming",
    title: "Programmation",
    domain: "programming",
    language: "fr",
    keywords: [
      "programmation", "code", "algorithme", "développement",
      "logiciel", "débogage", "tests"
    ],
    content:
      "La programmation consiste à écrire des instructions exécutables par un ordinateur. " +
      "Un bon code doit être lisible, testable, sécurisé et maintenable. " +
      "Le développement logiciel comprend généralement l'analyse des besoins, la conception, " +
      "l'implémentation, les tests, le déploiement et la maintenance."
  },
  {
    id: "fr-javascript",
    title: "JavaScript",
    domain: "programming",
    language: "fr",
    keywords: [
      "javascript", "fonction", "variable", "promise",
      "async", "await", "ecmascript", "programmation asynchrone"
    ],
    content:
      "JavaScript est un langage utilisé dans les navigateurs et les environnements serveur. " +
      "Il prend en charge les fonctions, les objets, les tableaux, les modules et la programmation asynchrone. " +
      "Le code moderne utilise souvent const et let pour déclarer les variables, " +
      "les Promises et async/await pour les opérations asynchrones."
  },
  {
    id: "fr-web",
    title: "Développement web",
    domain: "programming",
    language: "fr",
    keywords: [
      "web", "site internet", "html", "css", "react",
      "next.js", "frontend", "backend", "application web"
    ],
    content:
      "HTML définit la structure d'une page, CSS contrôle sa présentation et JavaScript ajoute l'interactivité. " +
      "React facilite la création d'interfaces utilisateur basées sur des composants. " +
      "Next.js est un framework React qui propose notamment le routage et des fonctionnalités côté serveur. " +
      "Le développement web doit aussi prendre en compte l'accessibilité, les performances, " +
      "la sécurité, le responsive design et les tests."
  },
  {
    id: "fr-security",
    title: "Sécurité numérique",
    domain: "technology",
    language: "fr",
    keywords: [
      "sécurité", "mot de passe", "confidentialité", "protection",
      "authentification", "autorisation", "chiffrement", "cybersécurité"
    ],
    content:
      "La sécurité numérique protège les comptes, les systèmes, les applications et les données. " +
      "Utilisez des mots de passe uniques, une authentification multifacteur et des mises à jour régulières. " +
      "Les applications doivent valider les entrées, protéger les secrets et gérer les erreurs de manière sûre. " +
      "Les informations sensibles ne doivent pas être exposées dans les journaux ou les réponses."
  },
  {
    id: "fr-learning",
    title: "Apprentissage",
    domain: "education",
    language: "fr",
    keywords: [
      "apprentissage", "étude", "éducation", "pratique",
      "connaissances", "révision", "répétition espacée"
    ],
    content:
      "L'apprentissage est renforcé par des explications claires, des exercices pratiques, " +
      "des révisions régulières et une vérification de la compréhension. " +
      "Les apprenants progressent grâce aux retours constructifs et à des exercices de difficulté croissante."
  },
  {
    id: "fr-xsus",
    title: "Plateforme XSUS AI",
    domain: "technology",
    language: "fr",
    keywords: [
      "xsus", "xsus ai", "xsus studio", "moteur linguistique",
      "base de connaissances", "cœur de l'ia", "ia multilingue"
    ],
    content:
      "XSUS AI est développé avec des modules séparés pour le cœur de l'IA, " +
      "le traitement des langues, la recherche de connaissances et l'enregistrement des services. " +
      "Les nouveaux modules doivent être intégrés progressivement sans perturber les services existants. " +
      "L'architecture doit prendre en charge les connaissances multilingues, les tests automatisés " +
      "et une future intégration avec des moteurs de modèles."
  }
];

function normalizeLimit(value, fallback = 5) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1, Math.min(Math.floor(parsed), 20));
}

function scoreEntry(entry, query) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return 0;

  const terms = [
    ...new Set(normalizedQuery.split(/\s+/u).filter(Boolean))
  ];

  const title = normalizeForSearch(entry.title);
  const content = normalizeForSearch(entry.content);
  const keywords = entry.keywords.map(normalizeForSearch);
  const titleTokens = new Set(title.split(/\s+/u));
  const contentTokens = new Set(content.split(/\s+/u));

  let score = 0;

  if (title === normalizedQuery) score += 12;
  else if (title.includes(normalizedQuery)) score += 8;

  if (content.includes(normalizedQuery)) score += 5;

  for (const term of terms) {
    if (titleTokens.has(term)) score += 4;

    if (
      keywords.some(keyword =>
        keyword.split(/\s+/u).includes(term)
      )
    ) {
      score += 3;
    }

    if (contentTokens.has(term)) score += 1;
  }

  if (
    terms.length > 1 &&
    terms.every(term => titleTokens.has(term))
  ) {
    score += 5;
  }

  return score;
}

/**
 * Recherche dans la base française et classe les résultats.
 */
export function searchFrenchKnowledge(query, options = {}) {
  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(query);
  const limit = normalizeLimit(options.limit);

  return FR_KNOWLEDGE
    .map((entry, index) => ({
      entry,
      index,
      score: scoreEntry(entry, normalizedQuery)
    }))
    .filter(result => result.score > 0)
    .sort((a, b) =>
      b.score - a.score || a.index - b.index
    )
    .slice(0, limit)
    .map(({ entry, score }) => ({
      ...entry,
      keywords: [...entry.keywords],
      source: "fr-knowledge",
      score
    }));
}

/**
 * Retourne une entrée par son identifiant.
 */
export function getFrenchKnowledgeById(id) {
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }

  const entry = FR_KNOWLEDGE.find(
    item => item.id === id.trim()
  );

  return entry
    ? { ...entry, keywords: [...entry.keywords] }
    : null;
}

/**
 * Retourne la liste des sujets disponibles.
 */
export function listFrenchKnowledgeTopics() {
  return FR_KNOWLEDGE.map(({ id, title, domain, language }) => ({
    id,
    title,
    domain,
    language
  }));
}

/**
 * Retourne les statistiques de la base française.
 */
export function getFrenchKnowledgeStats() {
  return {
    version: FR_KNOWLEDGE_VERSION,
    count: FR_KNOWLEDGE.length,
    language: "fr",
    domains: [...new Set(FR_KNOWLEDGE.map(entry => entry.domain))],
    ids: FR_KNOWLEDGE.map(entry => entry.id)
  };
}
