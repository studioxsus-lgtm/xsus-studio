
/**
 * XSUS Hyper Core — Knowledge Graph Public API
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ofrimi i API-së publike për Knowledge Graph.
 * - Izolimi i konsumatorëve nga Engine.
 * - Standardizimi i operacioneve publike.
 * - Ruajtja e kompatibilitetit me Engine-in.
 *
 * Ky komponent nuk implementon logjikë të brendshme
 * të grafit apo algoritmeve.
 */

import {
  createKnowledgeGraphEngine
} from "../engines/knowledge-graph.engine.js";

export const KNOWLEDGE_GRAPH_API_VERSION = "1.0.0";

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

function requireNonEmptyString(value, field) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${field} must be a non-empty string.`
    );
  }

  return value.trim();
}

function validateOptions(options) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "Knowledge Graph API options must be a plain object."
    );
  }
}

/**
 * Krijon një instancë publike të Knowledge Graph API.
 */
export function createKnowledgeGraphAPI(options = {}) {
  validateOptions(options);

  const engine = createKnowledgeGraphEngine(options);

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error("Knowledge Graph API is closed.");
    }
  }

  function getGraph() {
    assertOpen();
    return engine.getGraph();
  }

  function addNode(input) {
    assertOpen();
    return engine.addNode(input);
  }

  function addNodes(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("inputs must be an array.");
    }

    return engine.addNodes(inputs);
  }

  function updateNode(id, updates) {
    assertOpen();

    return engine.updateNode(
      requireNonEmptyString(id, "id"),
      updates
    );
  }

  function getNode(id) {
    assertOpen();

    return engine.getNode(
      requireNonEmptyString(id, "id")
    );
  }

  function removeNode(id) {
    assertOpen();

    return engine.removeNode(
      requireNonEmptyString(id, "id")
    );
  }

  function addLink(input) {
    assertOpen();
    return engine.addLink(input);
  }

  function addLinks(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("inputs must be an array.");
    }

    return engine.addLinks(inputs);
  }

  function getLink(id) {
    assertOpen();

    return engine.getLink(
      requireNonEmptyString(id, "id")
    );
  }

  function removeLink(id) {
    assertOpen();

    return engine.removeLink(
      requireNonEmptyString(id, "id")
    );
  }

  function updateMetadata(metadata) {
    assertOpen();
    return engine.updateMetadata(metadata);
  }

  function findNodes(filters = {}) {
    assertOpen();

    if (!isPlainObject(filters)) {
      throw new TypeError(
        "filters must be a plain object."
      );
    }

    return engine.findNodes(filters);
  }

  function findLinks(filters = {}) {
    assertOpen();

    if (!isPlainObject(filters)) {
      throw new TypeError(
        "filters must be a plain object."
      );
    }

    return engine.findLinks(filters);
  }

  function traverse(startNodeId, options = {}) {
    assertOpen();

    return engine.traverse(
      requireNonEmptyString(startNodeId, "startNodeId"),
      options
    );
  }

  function traverseDepthFirst(startNodeId, options = {}) {
    assertOpen();

    return engine.traverseDepthFirst(
      requireNonEmptyString(startNodeId, "startNodeId"),
      options
    );
  }

  function getReachable(startNodeId, options = {}) {
    assertOpen();

    return engine.getReachable(
      requireNonEmptyString(startNodeId, "startNodeId"),
      options
    );
  }

  function detectCycles() {
    assertOpen();
    return engine.detectCycles();
  }

  function getCycleNodes() {
    assertOpen();
    return engine.getCycleNodes();
  }

  function hasCycles() {
    assertOpen();
    return engine.hasCycles();
  }

  function isAcyclicGraph() {
    assertOpen();
    return engine.isAcyclicGraph();
  }

  function getCycleReport() {
    assertOpen();
    return engine.getCycleReport();
  }

  function findShortestPath(sourceId, targetId, options = {}) {
    assertOpen();

    return engine.findShortestPath(
      requireNonEmptyString(sourceId, "sourceId"),
      requireNonEmptyString(targetId, "targetId"),
      options
    );
  }

  function findAllPaths(sourceId, targetId, options = {}) {
    assertOpen();

    return engine.findAllPaths(
      requireNonEmptyString(sourceId, "sourceId"),
      requireNonEmptyString(targetId, "targetId"),
      options
    );
  }

  function hasPath(sourceId, targetId, options = {}) {
    assertOpen();

    return engine.hasPath(
      requireNonEmptyString(sourceId, "sourceId"),
      requireNonEmptyString(targetId, "targetId"),
      options
    );
  }

  function findConnectedComponents(options = {}) {
    assertOpen();
    return engine.findConnectedComponents(options);
  }

  function countConnectedComponents(options = {}) {
    assertOpen();
    return engine.countConnectedComponents(options);
  }

  function isConnectedGraph(options = {}) {
    assertOpen();
    return engine.isConnectedGraph(options);
  }

  function clear() {
    assertOpen();
    return engine.clear();
  }

  function getStatus() {
    assertOpen();
    return engine.getStatus();
  }

  function verifyIntegrity() {
    assertOpen();
    return engine.verifyIntegrity();
  }

  function rebuildIntegrity() {
    assertOpen();
    return engine.rebuildIntegrity();
  }

  function close() {
    if (closed) {
      return;
    }

    engine.close();
    closed = true;
  }

  return Object.freeze({
    version: KNOWLEDGE_GRAPH_API_VERSION,

    getGraph,

    addNode,
    addNodes,
    updateNode,
    getNode,
    removeNode,

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

    detectCycles,
    getCycleNodes,
    hasCycles,
    isAcyclicGraph,
    getCycleReport,

    findShortestPath,
    findAllPaths,
    hasPath,

    findConnectedComponents,
    countConnectedComponents,
    isConnectedGraph,

    clear,

    getStatus,
    verifyIntegrity,
    rebuildIntegrity,

    close
  });
}

export function getKnowledgeGraphAPIVersion() {
  return KNOWLEDGE_GRAPH_API_VERSION;
}
