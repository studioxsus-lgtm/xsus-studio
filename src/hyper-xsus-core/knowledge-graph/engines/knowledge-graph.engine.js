
/**
 * XSUS Hyper Core — Knowledge Graph Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Menaxhimi i Knowledge Graph.
 * - Menaxhimi i nodes dhe links.
 * - Integrimi me Knowledge Graph Model dhe Validator.
 * - Traversal BFS dhe DFS.
 * - Cycle detection.
 * - Path finding.
 * - Connected components.
 * - Kontrolli dhe rikuperimi i integritetit.
 */

import {
  createKnowledgeGraph,
  cloneKnowledgeGraph
} from "../models/knowledge-graph.model.js";

import {
  validateKnowledgeGraph
} from "../validators/knowledge-graph.validator.js";

import {
  breadthFirstSearch,
  depthFirstSearch,
  getReachableNodeIds
} from "../algorithms/graph-traversal.js";

import {
  detectCycles,
  getCycleNodes,
  hasCycles,
  isAcyclicGraph,
  getCycleDetectionReport
} from "../algorithms/cycle-detection.js";

import {
  findShortestPath,
  findAllPaths,
  hasPath
} from "../algorithms/path-finder.js";

import {
  findConnectedComponents,
  countConnectedComponents,
  isConnectedGraph
} from "../algorithms/connected-components.js";

export const KNOWLEDGE_GRAPH_ENGINE_VERSION = "1.0.0";

const NODE_TYPES = new Set([
  "concept",
  "entity",
  "document",
  "topic",
  "system",
  "custom"
]);

const RELATION_TYPES = new Set([
  "supports",
  "depends_on",
  "contains",
  "part_of",
  "causes",
  "derived_from",
  "related_to",
  "contradicts",
  "implements",
  "specializes"
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function cloneJsonValue(value) {
  if (value === null || typeof value !== "object") {
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

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function assertGraph(graph) {
  const validation = validateKnowledgeGraph(graph);

  if (!validation.valid) {
    throw new TypeError(
      `Invalid Knowledge Graph: ${validation.errors.join(" ")}`
    );
  }
}

function assertUniqueId(items, id, message) {
  if (items.some((item) => item.id === id)) {
    throw new Error(message);
  }
}

function createTimestamp() {
  return new Date().toISOString();
}

function normalizeNode(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("Node must be a plain object.");
  }

  const node = {
    id: assertNonEmptyString(input.id, "node.id")
  };

  if (Object.prototype.hasOwnProperty.call(input, "type")) {
    if (!NODE_TYPES.has(input.type)) {
      throw new TypeError("Invalid node type.");
    }

    node.type = input.type;
  }

  if (Object.prototype.hasOwnProperty.call(input, "label")) {
    node.label = assertNonEmptyString(
      input.label,
      "node.label"
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, "metadata")) {
    if (!isPlainObject(input.metadata)) {
      throw new TypeError("Node metadata must be a plain object.");
    }

    node.metadata = cloneJsonValue(input.metadata);
  }

  return node;
}

function normalizeLink(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("Link must be a plain object.");
  }

  const link = {
    id: assertNonEmptyString(input.id, "link.id"),
    sourceId: assertNonEmptyString(
      input.sourceId,
      "link.sourceId"
    ),
    targetId: assertNonEmptyString(
      input.targetId,
      "link.targetId"
    ),
    relationType: assertNonEmptyString(
      input.relationType,
      "link.relationType"
    ),
    confidence: input.confidence,
    createdAt: input.createdAt,
    metadata: cloneJsonValue(input.metadata)
  };

  if (!RELATION_TYPES.has(link.relationType)) {
    throw new TypeError("Invalid link relationType.");
  }

  return link;
}

function createLinkFromInput(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("Link input must be a plain object.");
  }

  return normalizeLink({
    ...input,
    id: input.id ?? createId("link"),
    confidence: input.confidence ?? 1,
    createdAt: input.createdAt ?? createTimestamp(),
    metadata: input.metadata ?? {}
  });
}

function createGraphSnapshot(graph, changes = {}) {
  const snapshot = {
    id: graph.id,
    version: graph.version,
    nodes: changes.nodes ?? graph.nodes,
    links: changes.links ?? graph.links,
    metadata: changes.metadata ?? graph.metadata,
    createdAt: graph.createdAt
  };

  return createKnowledgeGraph(
    cloneJsonValue(snapshot)
  );
}

export function createKnowledgeGraphEngine(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("Engine options must be a plain object.");
  }

  const initialGraph = options.graph ?? {
    id: options.id ?? createId("graph"),
    version: "1.0.0",
    nodes: [],
    links: [],
    metadata: options.metadata ?? {},
    createdAt: options.createdAt ?? createTimestamp()
  };

  let graph = createKnowledgeGraph(
    cloneJsonValue(initialGraph)
  );

  let closed = false;

  function ensureOpen() {
    if (closed) {
      throw new Error("Knowledge Graph Engine is closed.");
    }
  }

  function commit(nextGraph) {
    assertGraph(nextGraph);
    graph = createKnowledgeGraph(
      cloneJsonValue(nextGraph)
    );

    return graph;
  }

  function getNodeIndex(nodeId) {
    return graph.nodes.findIndex(
      (node) => node.id === nodeId
    );
  }

  function getLinkIndex(linkId) {
    return graph.links.findIndex(
      (link) => link.id === linkId
    );
  }

  function getNode(nodeId) {
    const id = assertNonEmptyString(nodeId, "nodeId");

    return graph.nodes.find(
      (node) => node.id === id
    ) ?? null;
  }

  function getLink(linkId) {
    const id = assertNonEmptyString(linkId, "linkId");

    return graph.links.find(
      (link) => link.id === id
    ) ?? null;
  }

  function addNode(input) {
    ensureOpen();

    const node = normalizeNode(input);

    assertUniqueId(
      graph.nodes,
      node.id,
      "Graph node ID already exists."
    );

    const nodes = [
      ...graph.nodes,
      node
    ];

    commit(
      createGraphSnapshot(graph, { nodes })
    );

    return getNode(node.id);
  }

  function addNodes(inputs) {
    ensureOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("Nodes must be an array.");
    }

    const nodes = inputs.map(normalizeNode);
    const ids = new Set(graph.nodes.map((node) => node.id));

    for (const node of nodes) {
      if (ids.has(node.id)) {
        throw new Error("Graph node ID already exists.");
      }

      ids.add(node.id);
    }

    commit(
      createGraphSnapshot(graph, {
        nodes: [...graph.nodes, ...nodes]
      })
    );

    return nodes.map((node) => getNode(node.id));
  }

  function updateNode(nodeId, updates) {
    ensureOpen();

    const id = assertNonEmptyString(nodeId, "nodeId");

    if (!isPlainObject(updates)) {
      throw new TypeError("Node updates must be a plain object.");
    }

    const index = getNodeIndex(id);

    if (index === -1) {
      throw new Error(`Node not found: ${id}`);
    }

    const current = graph.nodes[index];

    const merged = {
      ...current,
      ...cloneJsonValue(updates),
      id
    };

    const normalized = normalizeNode(merged);

    const nodes = [...graph.nodes];
    nodes[index] = normalized;

    commit(
      createGraphSnapshot(graph, { nodes })
    );

    return getNode(id);
  }

  function removeNode(nodeId) {
    ensureOpen();

    const id = assertNonEmptyString(nodeId, "nodeId");

    if (getNodeIndex(id) === -1) {
      return false;
    }

    const nodes = graph.nodes.filter(
      (node) => node.id !== id
    );

    const links = graph.links.filter(
      (link) =>
        link.sourceId !== id &&
        link.targetId !== id
    );

    commit(
      createGraphSnapshot(graph, {
        nodes,
        links
      })
    );

    return true;
  }

  function addLink(input) {
    ensureOpen();

    const link = createLinkFromInput(input);

    assertUniqueId(
      graph.links,
      link.id,
      "Graph link ID already exists."
    );

    const nextGraph = createGraphSnapshot(graph, {
      links: [...graph.links, link]
    });

    commit(nextGraph);

    return getLink(link.id);
  }

  function addLinks(inputs) {
    ensureOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("Links must be an array.");
    }

    const links = inputs.map(createLinkFromInput);
    const ids = new Set(graph.links.map((link) => link.id));

    for (const link of links) {
      if (ids.has(link.id)) {
        throw new Error("Graph link ID already exists.");
      }

      ids.add(link.id);
    }

    commit(
      createGraphSnapshot(graph, {
        links: [...graph.links, ...links]
      })
    );

    return links.map((link) => getLink(link.id));
  }

  function removeLink(linkId) {
    ensureOpen();

    const id = assertNonEmptyString(linkId, "linkId");

    if (getLinkIndex(id) === -1) {
      return false;
    }

    commit(
      createGraphSnapshot(graph, {
        links: graph.links.filter(
          (link) => link.id !== id
        )
      })
    );

    return true;
  }

  function updateMetadata(metadata) {
    ensureOpen();

    if (!isPlainObject(metadata)) {
      throw new TypeError("Graph metadata must be a plain object.");
    }

    commit(
      createGraphSnapshot(graph, {
        metadata: cloneJsonValue(metadata)
      })
    );

    return graph.metadata;
  }

  function getGraph() {
    ensureOpen();
    return cloneKnowledgeGraph(graph);
  }

  function getStatus() {
    ensureOpen();

    return Object.freeze({
      version: KNOWLEDGE_GRAPH_ENGINE_VERSION,
      graphId: graph.id,
      nodeCount: graph.nodes.length,
      linkCount: graph.links.length,
      closed
    });
  }

  function findNodes(query = {}) {
    ensureOpen();

    if (!isPlainObject(query)) {
      throw new TypeError("Node query must be a plain object.");
    }

    return graph.nodes.filter((node) => {
      if (
        query.id !== undefined &&
        node.id !== query.id
      ) {
        return false;
      }

      if (
        query.type !== undefined &&
        node.type !== query.type
      ) {
        return false;
      }

      if (
        query.label !== undefined &&
        node.label !== query.label
      ) {
        return false;
      }

      return true;
    });
  }

  function findLinks(query = {}) {
    ensureOpen();

    if (!isPlainObject(query)) {
      throw new TypeError("Link query must be a plain object.");
    }

    return graph.links.filter((link) => {
      for (const field of [
        "id",
        "sourceId",
        "targetId",
        "relationType",
        "confidence"
      ]) {
        if (
          query[field] !== undefined &&
          link[field] !== query[field]
        ) {
          return false;
        }
      }

      return true;
    });
  }

  function traverse(startNodeId, options = {}) {
    ensureOpen();

    return breadthFirstSearch(
      graph,
      startNodeId,
      options
    );
  }

  function traverseDepthFirst(startNodeId, options = {}) {
    ensureOpen();

    return depthFirstSearch(
      graph,
      startNodeId,
      options
    );
  }

  function getReachable(startNodeId, options = {}) {
    ensureOpen();

    return getReachableNodeIds(
      graph,
      startNodeId,
      options
    );
  }

  function detectGraphCycles() {
    ensureOpen();
    return detectCycles(graph);
  }

  function getGraphCycleNodes() {
    ensureOpen();
    return getCycleNodes(graph);
  }

  function graphHasCycles() {
    ensureOpen();
    return hasCycles(graph);
  }

  function graphIsAcyclic() {
    ensureOpen();
    return isAcyclicGraph(graph);
  }

  function getCycleReport() {
    ensureOpen();
    return getCycleDetectionReport(graph);
  }

  function getShortestPath(sourceId, targetId, options = {}) {
    ensureOpen();

    return findShortestPath(
      graph,
      sourceId,
      targetId,
      options
    );
  }

  function getAllPaths(sourceId, targetId, options = {}) {
    ensureOpen();

    return findAllPaths(
      graph,
      sourceId,
      targetId,
      options
    );
  }

  function graphHasPath(sourceId, targetId, options = {}) {
    ensureOpen();

    return hasPath(
      graph,
      sourceId,
      targetId,
      options
    );
  }

  function getComponents(options = {}) {
    ensureOpen();
    return findConnectedComponents(graph, options);
  }

  function getComponentCount(options = {}) {
    ensureOpen();
    return countConnectedComponents(graph, options);
  }

  function graphIsConnected(options = {}) {
    ensureOpen();
    return isConnectedGraph(graph, options);
  }

  function verifyIntegrity() {
    ensureOpen();

    const validation = validateKnowledgeGraph(graph);

    return Object.freeze({
      valid: validation.valid,
      errors: [...validation.errors],
      nodeCount: graph.nodes.length,
      linkCount: graph.links.length
    });
  }

  function rebuildIntegrity() {
    ensureOpen();

    const repaired = createKnowledgeGraph(
      cloneJsonValue(graph)
    );

    commit(repaired);

    return verifyIntegrity();
  }

  function clear() {
    ensureOpen();

    commit(
      createGraphSnapshot(graph, {
        nodes: [],
        links: []
      })
    );

    return true;
  }

  function close() {
    if (closed) {
      return false;
    }

    closed = true;

    return true;
  }

  return Object.freeze({
    version: KNOWLEDGE_GRAPH_ENGINE_VERSION,

    getGraph,
    getStatus,

    addNode,
    addNodes,
    updateNode,
    removeNode,

    getNode,
    addLink,
    addLinks,
    getLink,
    removeLink,

    updateMetadata,

    findNodes,
    findLinks,

    traverse,
    traverseDepthFirst,
    getReachable,

    detectCycles: detectGraphCycles,
    getCycleNodes: getGraphCycleNodes,
    hasCycles: graphHasCycles,
    isAcyclicGraph: graphIsAcyclic,
    getCycleReport,

    findShortestPath: getShortestPath,
    findAllPaths: getAllPaths,
    hasPath: graphHasPath,

    findConnectedComponents: getComponents,
    countConnectedComponents: getComponentCount,
    isConnectedGraph: graphIsConnected,

    verifyIntegrity,
    rebuildIntegrity,
    clear,
    close
  });
}

export function getKnowledgeGraphEngineVersion() {
  return KNOWLEDGE_GRAPH_ENGINE_VERSION;
}
