
/**
 * Knowledge Graph Model
 * XSUS Hyper Core
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi i Knowledge Graph.
 * - Normalizimi i strukturës.
 * - Validimi përmes Knowledge Graph Validator.
 * - Deep clone i të dhënave.
 * - Deep freeze për integritetin e modelit.
 */

import {
  validateKnowledgeGraph
} from "../validators/knowledge-graph.validator.js";

export const KNOWLEDGE_GRAPH_MODEL_VERSION = "1.0.0";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function cloneJsonValue(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  const clone = {};

  for (const key of Object.keys(value)) {
    clone[key] = cloneJsonValue(value[key]);
  }

  return clone;
}

function deepFreeze(value, visited = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    visited.has(value)
  ) {
    return value;
  }

  visited.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], visited);
  }

  return Object.freeze(value);
}

function normalizeNode(node) {
  const normalized = {
    id: node.id.trim()
  };

  if (Object.prototype.hasOwnProperty.call(node, "type")) {
    normalized.type = node.type;
  }

  if (Object.prototype.hasOwnProperty.call(node, "label")) {
    normalized.label = node.label.trim();
  }

  if (Object.prototype.hasOwnProperty.call(node, "metadata")) {
    normalized.metadata = cloneJsonValue(node.metadata);
  }

  return normalized;
}

function normalizeLink(link) {
  return {
    id: link.id.trim(),
    sourceId: link.sourceId.trim(),
    targetId: link.targetId.trim(),
    relationType: link.relationType.trim(),
    confidence: link.confidence,
    createdAt: link.createdAt,
    metadata: cloneJsonValue(link.metadata)
  };
}

export function createKnowledgeGraph(input) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Knowledge Graph input must be a plain object."
    );
  }

  const graph = {
    id: input.id,
    version: input.version,
    nodes: Array.isArray(input.nodes)
      ? input.nodes.map((node) =>
          isPlainObject(node) ? normalizeNode(node) : node
        )
      : input.nodes,
    links: Array.isArray(input.links)
      ? input.links.map((link) =>
          isPlainObject(link) ? normalizeLink(link) : link
        )
      : input.links,
    metadata: isPlainObject(input.metadata)
      ? cloneJsonValue(input.metadata)
      : input.metadata,
    createdAt: input.createdAt
  };

  if (typeof graph.id === "string") {
    graph.id = graph.id.trim();
  }

  if (graph.version === undefined) {
    graph.version = KNOWLEDGE_GRAPH_MODEL_VERSION;
  }

  const validation = validateKnowledgeGraph(graph);

  if (!validation.valid) {
    throw new TypeError(
      `Invalid Knowledge Graph: ${validation.errors.join(" ")}`
    );
  }

  return deepFreeze(graph);
}

export function isKnowledgeGraphModel(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return validateKnowledgeGraph(value).valid;
}

export function cloneKnowledgeGraph(graph) {
  if (!isKnowledgeGraphModel(graph)) {
    throw new TypeError(
      "Cannot clone an invalid Knowledge Graph."
    );
  }

  return createKnowledgeGraph(
    cloneJsonValue(graph)
  );
}

export function getKnowledgeGraphModelVersion() {
  return KNOWLEDGE_GRAPH_MODEL_VERSION;
}
