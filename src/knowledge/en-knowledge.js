
/**
 * XSUS AI — English Knowledge Base
 * Version: 1.1.0
 * Language: English (en)
 * Domain: general / programming / technology
 */

import { normalizeForSearch } from "../language/normalization.js";

export const EN_KNOWLEDGE_VERSION = "1.1.0";

export const EN_KNOWLEDGE = [
  {
    id: "en-ai",
    title: "Artificial Intelligence",
    domain: "technology",
    language: "en",
    keywords: [
      "artificial intelligence", "ai", "machine learning",
      "model", "neural network", "generative ai"
    ],
    content:
      "Artificial intelligence develops systems that perform tasks such as " +
      "language processing, pattern recognition, prediction, and content generation. " +
      "Machine learning enables systems to learn patterns from data. " +
      "AI results should be evaluated for accuracy, reliability, bias, and safety."
  },
  {
    id: "en-programming",
    title: "Programming",
    domain: "programming",
    language: "en",
    keywords: [
      "programming", "coding", "code", "algorithm",
      "software development", "debugging", "testing"
    ],
    content:
      "Programming is the process of writing instructions that a computer can execute. " +
      "Good code should be readable, testable, secure, and maintainable. " +
      "Software development commonly includes requirements, design, implementation, testing, " +
      "deployment, monitoring, and ongoing maintenance."
  },
  {
    id: "en-javascript",
    title: "JavaScript",
    domain: "programming",
    language: "en",
    keywords: [
      "javascript", "js", "function", "variable",
      "promise", "async", "await", "ecmascript"
    ],
    content:
      "JavaScript is a programming language used in browsers and server environments. " +
      "It supports functions, objects, arrays, modules, and asynchronous programming. " +
      "Modern JavaScript commonly uses const and let for variable declarations, " +
      "Promises and async/await for asynchronous operations, and modules for code organization."
  },
  {
    id: "en-web",
    title: "Web Development",
    domain: "programming",
    language: "en",
    keywords: [
      "web", "website", "html", "css", "react",
      "next.js", "frontend", "backend", "web application"
    ],
    content:
      "HTML defines page structure, CSS controls presentation, and JavaScript adds interactivity. " +
      "React helps developers build component-based user interfaces. " +
      "Next.js provides a framework for building React applications with routing and server features. " +
      "Professional web development also considers accessibility, performance, security, " +
      "responsive design, testing, and maintainability."
  },
  {
    id: "en-security",
    title: "Digital Security",
    domain: "technology",
    language: "en",
    keywords: [
      "security", "password", "privacy", "protection",
      "authentication", "authorization", "encryption", "cybersecurity"
    ],
    content:
      "Digital security protects accounts, systems, applications, and data. " +
      "Use unique passwords, multi-factor authentication, regular updates, and least-privilege access. " +
      "Applications should validate inputs, protect secrets, handle errors safely, " +
      "and avoid exposing sensitive information in logs or responses."
  },
  {
    id: "en-learning",
    title: "Learning",
    domain: "education",
    language: "en",
    keywords: [
      "learning", "education", "study", "practice",
      "teaching", "knowledge", "spaced repetition"
    ],
    content:
      "Effective learning combines clear explanations, practical exercises, spaced repetition, " +
      "and regular checks of understanding. " +
      "Learners benefit from feedback, progressively challenging tasks, " +
      "and opportunities to apply knowledge in real situations."
  },
  {
    id: "en-xsus",
    title: "XSUS AI Platform",
    domain: "technology",
    language: "en",
    keywords: [
      "xsus", "xsus ai", "xsus studio",
      "language engine", "knowledge base", "ai core", "multilingual ai"
    ],
    content:
      "XSUS AI is being developed with separate modules for the AI core, language processing, " +
      "knowledge sources, retrieval, and service registration. " +
      "New modules should be integrated gradually without disrupting existing services. " +
      "The architecture should support multilingual knowledge, automated tests, " +
      "clear interfaces, and future integration with model runtimes."
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

    if (keywords.some(keyword =>
      keyword.split(/\s+/u).includes(term)
    )) {
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
 * Searches English knowledge and returns ranked results.
 */
export function searchEnglishKnowledge(query, options = {}) {
  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(query);
  const limit = normalizeLimit(options.limit);

  return EN_KNOWLEDGE
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
      source: "en-knowledge",
      score
    }));
}

/**
 * Returns one English knowledge entry by ID.
 */
export function getEnglishKnowledgeById(id) {
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }

  const entry = EN_KNOWLEDGE.find(
    item => item.id === id.trim()
  );

  return entry
    ? { ...entry, keywords: [...entry.keywords] }
    : null;
}

/**
 * Returns the list of available English topics.
 */
export function listEnglishKnowledgeTopics() {
  return EN_KNOWLEDGE.map(({ id, title, domain, language }) => ({
    id,
    title,
    domain,
    language
  }));
}

/**
 * Returns basic metadata for the English knowledge base.
 */
export function getEnglishKnowledgeStats() {
  return {
    version: EN_KNOWLEDGE_VERSION,
    count: EN_KNOWLEDGE.length,
    language: "en",
    domains: [...new Set(EN_KNOWLEDGE.map(entry => entry.domain))],
    ids: EN_KNOWLEDGE.map(entry => entry.id)
  };
}
