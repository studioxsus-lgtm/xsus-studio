
/**
 * XSUS Hyper Core — XSUS AI Knowledge Adapter
 * Version: 1.1.0
 *
 * Integrimi zyrtar ndërmjet:
 * - XSUS AI Core
 * - KnowledgeLinking
 * - KnowledgeGraph
 *
 * Përgjegjësitë:
 * - Inicializimi i API-ve publike.
 * - Kërkimi tekstual në KnowledgeGraph.
 * - Zgjerimi i kontekstit përmes KnowledgeLinking.
 * - Standardizimi i rezultateve për XSUS AI Core.
 * - Izolimi i AI Core nga implementimi i Hyper Core.
 * - Menaxhimi i ciklit të jetës së integrimit.
 *
 * Shënim:
 * Ky version përdor kërkim tekstual me vlerësim përputhjeje.
 * Nuk implementon embeddings ose kërkim semantik.
 */

import {
  createKnowledgeLinkAPI,
} from "../public/knowledge-link.api.js";

import {
  createKnowledgeGraphAPI,
} from "../../knowledge-graph/public/knowledge-graph.api.js";

export const XSUS_AI_KNOWLEDGE_ADAPTER_VERSION = "1.1.0";

const DEFAULT_LIMIT = 5;
const DEFAULT_MINIMUM_SCORE = 0.1;
const RELATED_NODE_SCORE_FACTOR = 0.5;

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return [...new Set(
    normalized
      .split(/\s+/u)
      .filter((token) => token.length > 1)
  )];
}

function getLocalizedContent(metadata, language) {
  const content = metadata?.content;

  if (typeof content === "string") {
    return content;
  }

  if (!isPlainObject(content)) {
    return "";
  }

  const normalizedLanguage =
    typeof language === "string"
      ? language.toLowerCase().split("-")[0]
      : "";

  const candidates = [
    normalizedLanguage,
    "en",
    "sq",
    "fr",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof content[candidate] === "string") {
      return content[candidate];
    }
  }

  const firstText = Object.values(content).find(
    (value) => typeof value === "string"
  );

  return firstText || "";
}

function getKeywords(metadata) {
  const keywords = metadata?.keywords;

  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords.filter(
    (keyword) => typeof keyword === "string"
  );
}

function calculateMatchScore(query, node, language) {
  const metadata = isPlainObject(node?.metadata)
    ? node.metadata
    : {};

  const label = typeof node?.label === "string"
    ? node.label
    : "";

  const content = getLocalizedContent(metadata, language);
  const keywords = getKeywords(metadata);
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return 0;
  }

  const normalizedQuery = normalizeText(query);
  const normalizedLabel = normalizeText(label);
  const normalizedContent = normalizeText(content);

  const normalizedKeywords = keywords.map(normalizeText);

  let score = 0;

  if (
    normalizedLabel &&
    normalizedLabel === normalizedQuery
  ) {
    score += 5;
  } else if (
    normalizedLabel &&
    normalizedLabel.includes(normalizedQuery)
  ) {
    score += 3;
  }

  if (
    normalizedContent &&
    normalizedContent.includes(normalizedQuery)
  ) {
    score += 2;
  }

  for (const token of queryTokens) {
    if (normalizedLabel.includes(token)) {
      score += 2;
    }

    if (normalizedKeywords.some(
      (keyword) => keyword.includes(token)
    )) {
      score += 2;
    }

    if (normalizedContent.includes(token)) {
      score += 1;
    }
  }

  const maximumScore = queryTokens.length * 5 + 5;

  return Math.min(score / maximumScore, 1);
}

function normalizeLimit(value) {
  if (value === undefined || value === null) {
    return DEFAULT_LIMIT;
  }

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  ) {
    throw new TypeError(
      "retrieve limit must be an integer between 1 and 100."
    );
  }

  return value;
}

function normalizeMinimumScore(value) {
  if (value === undefined || value === null) {
    return DEFAULT_MINIMUM_SCORE;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new TypeError(
      "minimumScore must be a number between 0 and 1."
    );
  }

  return value;
}

export function createXsusAIKnowledgeAdapter(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "Adapter options must be a plain object."
    );
  }

  const {
    knowledgeLink: knowledgeLinkOptions = {},
    knowledgeGraph: knowledgeGraphOptions = {},
  } = options;

  if (
    !isPlainObject(knowledgeLinkOptions) ||
    !isPlainObject(knowledgeGraphOptions)
  ) {
    throw new TypeError(
      "KnowledgeLink and KnowledgeGraph options must be plain objects."
    );
  }

  const knowledgeLink = createKnowledgeLinkAPI(
    knowledgeLinkOptions
  );

  let knowledgeGraph;

  try {
    knowledgeGraph = createKnowledgeGraphAPI(
      knowledgeGraphOptions
    );
  } catch (error) {
    knowledgeLink.close();
    throw error;
  }

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "XSUS AI Knowledge Adapter is closed."
      );
    }
  }

  const link = Object.freeze({
    create(input) {
      assertOpen();
      return knowledgeLink.create(input);
    },

    add(input) {
      assertOpen();
      return knowledgeLink.add(input);
    },

    addMany(inputs) {
      assertOpen();
      return knowledgeLink.addMany(inputs);
    },

    getById(id) {
      assertOpen();
      return knowledgeLink.getById(id);
    },

    find(filters = {}) {
      assertOpen();
      return knowledgeLink.find(filters);
    },

    findByEntity(entityId) {
      assertOpen();
      return knowledgeLink.findByEntity(entityId);
    },

    findByStrategy(strategy) {
      assertOpen();
      return knowledgeLink.findByStrategy(strategy);
    },

    remove(id) {
      assertOpen();
      return knowledgeLink.remove(id);
    },

    getStatus() {
      assertOpen();
      return knowledgeLink.getStatus();
    },
  });

  const graph = Object.freeze({
    getGraph() {
      assertOpen();
      return knowledgeGraph.getGraph();
    },

    addNode(input) {
      assertOpen();
      return knowledgeGraph.addNode(input);
    },

    addNodes(inputs) {
      assertOpen();
      return knowledgeGraph.addNodes(inputs);
    },

    getNode(id) {
      assertOpen();
      return knowledgeGraph.getNode(id);
    },

    findNodes(filters = {}) {
      assertOpen();
      return knowledgeGraph.findNodes(filters);
    },

    findLinks(filters = {}) {
      assertOpen();
      return knowledgeGraph.findLinks(filters);
    },

    traverse(startNodeId, options = {}) {
      assertOpen();
      return knowledgeGraph.traverse(startNodeId, options);
    },

    getReachable(startNodeId, options = {}) {
      assertOpen();
      return knowledgeGraph.getReachable(startNodeId, options);
    },

    findShortestPath(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.findShortestPath(
        sourceId,
        targetId,
        options
      );
    },

    findAllPaths(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.findAllPaths(
        sourceId,
        targetId,
        options
      );
    },

    hasPath(sourceId, targetId, options = {}) {
      assertOpen();
      return knowledgeGraph.hasPath(
        sourceId,
        targetId,
        options
      );
    },

    detectCycles() {
      assertOpen();
      return knowledgeGraph.detectCycles();
    },

    getStatus() {
      assertOpen();
      return knowledgeGraph.getStatus();
    },
  });

  function retrieve(query, retrieveOptions = {}) {
    assertOpen();

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      throw new TypeError(
        "retrieve query must be a non-empty string."
      );
    }

    if (!isPlainObject(retrieveOptions)) {
      throw new TypeError(
        "retrieve options must be a plain object."
      );
    }

    const {
      language = "en",
      limit,
      minimumScore,
      includeRelated = true,
    } = retrieveOptions;

    if (
      typeof language !== "string" ||
      !language.trim()
    ) {
      throw new TypeError(
        "retrieve language must be a non-empty string."
      );
    }

    if (typeof includeRelated !== "boolean") {
      throw new TypeError(
        "includeRelated must be a boolean."
      );
    }

    const resultLimit = normalizeLimit(limit);
    const minimum = normalizeMinimumScore(minimumScore);

    const graphData = knowledgeGraph.getGraph();

    const nodes = Array.isArray(graphData?.nodes)
      ? graphData.nodes
      : [];

    const scoredNodes = nodes
      .map((node) => ({
        node,
        score: calculateMatchScore(query, node, language),
      }))
      .filter((item) => item.score >= minimum)
      .sort((a, b) => b.score - a.score);

    const selected = new Map();

    for (const item of scoredNodes) {
      if (selected.size >= resultLimit) {
        break;
      }

      selected.set(item.node.id, {
        node: item.node,
        score: item.score,
        matchedDirectly: true,
        relations: [],
      });
    }

    if (includeRelated && selected.size > 0) {
      const directMatches = [...selected.values()];

      for (const match of directMatches) {
        const linkResult = knowledgeLink.findByEntity(
          match.node.id
        );

        const links = Array.isArray(linkResult)
          ? linkResult
          : Array.isArray(linkResult?.links)
            ? linkResult.links
            : [];

        for (const relation of links) {
          const relatedId =
            relation.sourceId === match.node.id
              ? relation.targetId
              : relation.sourceId;

          if (
            !relatedId ||
            selected.has(relatedId) ||
            selected.size >= resultLimit
          ) {
            continue;
          }

          const relatedNode = knowledgeGraph.getNode(relatedId);

          if (!relatedNode) {
            continue;
          }

          selected.set(relatedId, {
            node: relatedNode,
            score: match.score * RELATED_NODE_SCORE_FACTOR,
            matchedDirectly: false,
            relations: [relation],
          });
        }
      }
    }

    const results = [...selected.values()]
      .map((item) => {
        const metadata = isPlainObject(item.node.metadata)
          ? item.node.metadata
          : {};

        return Object.freeze({
          id: item.node.id,
          title: item.node.label || item.node.id,
          type: item.node.type || "concept",
          content: getLocalizedContent(metadata, language),
          language,
          domain: metadata.domain || null,
          keywords: Object.freeze(getKeywords(metadata)),
          source: metadata.source || null,
          version: metadata.version || null,
          score: item.score,
          matchedDirectly: item.matchedDirectly,
          relations: Object.freeze(item.relations),
          metadata,
        });
      })
      .sort((a, b) => b.score - a.score);

    return Object.freeze({
      version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
      query,
      language,
      count: results.length,
      results: Object.freeze(results),
      source: "hyper-xsus-core",
    });
  }

  function getStatus() {
    assertOpen();

    return Object.freeze({
      version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
      connected: true,
      capabilities: Object.freeze({
        textRetrieval: true,
        relatedKnowledgeExpansion: true,
        semanticEmbeddings: false,
      }),
      knowledgeLink: knowledgeLink.getStatus(),
      knowledgeGraph: knowledgeGraph.getStatus(),
    });
  }

  function close() {
    if (closed) {
      return;
    }

    closed = true;

    let firstError = null;

    try {
      knowledgeGraph.close();
    } catch (error) {
      firstError = error;
    }

    try {
      knowledgeLink.close();
    } catch (error) {
      if (!firstError) {
        firstError = error;
      }
    }

    if (firstError) {
      throw firstError;
    }
  }

  return Object.freeze({
    version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
    link,
    graph,
    retrieve,
    getStatus,
    close,
  });
}
