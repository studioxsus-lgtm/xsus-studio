
/**
 * XSUS Hyper Core — Knowledge Graph Path Finder
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Gjetja e rrugës më të shkurtër ndërmjet dy nyjeve.
 * - Gjetja e të gjitha rrugëve të mundshme.
 * - Mbështetja e drejtimit outgoing, incoming dhe both.
 * - Kufizimi i thellësisë dhe numrit të rrugëve.
 * - Ruajtja e rendit determinist të rezultateve.
 *
 * Graph structure:
 * {
 *   nodes: [{ id: "..." }],
 *   links: [{ sourceId: "...", targetId: "..." }]
 * }
 */

export const PATH_FINDER_VERSION = "1.0.0";

const VALID_DIRECTIONS = new Set([
  "outgoing",
  "incoming",
  "both"
]);

const DEFAULT_MAX_PATHS = 100;

function validateGraph(graph) {
  if (
    !graph ||
    typeof graph !== "object" ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.links)
  ) {
    throw new TypeError("Invalid knowledge graph.");
  }

  const nodeIds = new Set();

  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id.trim()
    ) {
      throw new TypeError("Invalid graph node.");
    }

    if (nodeIds.has(node.id)) {
      throw new TypeError("Duplicate graph node ID.");
    }

    nodeIds.add(node.id);
  }

  for (const link of graph.links) {
    if (
      !link ||
      typeof link.sourceId !== "string" ||
      typeof link.targetId !== "string" ||
      !nodeIds.has(link.sourceId) ||
      !nodeIds.has(link.targetId)
    ) {
      throw new TypeError("Invalid graph link reference.");
    }
  }

  return nodeIds;
}

function validateOptions(options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Invalid path finder options.");
  }

  const direction = options.direction ?? "outgoing";
  const maxDepth = options.maxDepth ?? Infinity;
  const maxPaths = options.maxPaths ?? DEFAULT_MAX_PATHS;

  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError("Invalid traversal direction.");
  }

  if (
    maxDepth !== Infinity &&
    (!Number.isInteger(maxDepth) || maxDepth < 0)
  ) {
    throw new TypeError("maxDepth must be a non-negative integer.");
  }

  if (
    !Number.isInteger(maxPaths) ||
    maxPaths < 1
  ) {
    throw new TypeError("maxPaths must be a positive integer.");
  }

  return {
    direction,
    maxDepth,
    maxPaths
  };
}

function buildAdjacency(graph, direction) {
  const adjacency = new Map();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const link of graph.links) {
    const { sourceId, targetId } = link;

    if (
      direction === "outgoing" ||
      direction === "both"
    ) {
      adjacency.get(sourceId).push(targetId);
    }

    if (
      direction === "incoming" ||
      direction === "both"
    ) {
      adjacency.get(targetId).push(sourceId);
    }
  }

  return adjacency;
}

/**
 * Gjen rrugën më të shkurtër ndërmjet dy nyjeve.
 *
 * Kthen:
 * - Array me node IDs kur rruga ekziston.
 * - null kur rruga nuk ekziston.
 */
export function findShortestPath(
  graph,
  startId,
  targetId,
  options = {}
) {
  const nodeIds = validateGraph(graph);
  const config = validateOptions(options);

  if (
    typeof startId !== "string" ||
    typeof targetId !== "string" ||
    !startId.trim() ||
    !targetId.trim()
  ) {
    throw new TypeError("Invalid start or target node ID.");
  }

  if (
    !nodeIds.has(startId) ||
    !nodeIds.has(targetId)
  ) {
    return null;
  }

  if (startId === targetId) {
    return [startId];
  }

  const adjacency = buildAdjacency(
    graph,
    config.direction
  );

  const queue = [[startId]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentId = path[path.length - 1];
    const depth = path.length - 1;

    if (depth >= config.maxDepth) {
      continue;
    }

    const neighbors = adjacency.get(currentId) ?? [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      const nextPath = [...path, neighborId];

      if (neighborId === targetId) {
        return nextPath;
      }

      visited.add(neighborId);
      queue.push(nextPath);
    }
  }

  return null;
}

/**
 * Gjen të gjitha rrugët e thjeshta ndërmjet
 * dy nyjeve, deri në maxDepth dhe maxPaths.
 *
 * Një rrugë e thjeshtë nuk e viziton dy herë
 * të njëjtën nyje.
 */
export function findAllPaths(
  graph,
  startId,
  targetId,
  options = {}
) {
  const nodeIds = validateGraph(graph);
  const config = validateOptions(options);

  if (
    typeof startId !== "string" ||
    typeof targetId !== "string" ||
    !startId.trim() ||
    !targetId.trim()
  ) {
    throw new TypeError("Invalid start or target node ID.");
  }

  if (
    !nodeIds.has(startId) ||
    !nodeIds.has(targetId)
  ) {
    return [];
  }

  if (startId === targetId) {
    return [[startId]];
  }

  const adjacency = buildAdjacency(
    graph,
    config.direction
  );

  const results = [];
  const path = [startId];
  const visited = new Set([startId]);

  function explore(currentId) {
    if (results.length >= config.maxPaths) {
      return;
    }

    const depth = path.length - 1;

    if (depth >= config.maxDepth) {
      return;
    }

    const neighbors = adjacency.get(currentId) ?? [];

    for (const neighborId of neighbors) {
      if (results.length >= config.maxPaths) {
        return;
      }

      if (visited.has(neighborId)) {
        continue;
      }

      path.push(neighborId);
      visited.add(neighborId);

      if (neighborId === targetId) {
        results.push([...path]);
      } else {
        explore(neighborId);
      }

      visited.delete(neighborId);
      path.pop();
    }
  }

  explore(startId);

  return results;
}

/**
 * Kontrollon nëse ekziston një rrugë.
 */
export function hasPath(
  graph,
  startId,
  targetId,
  options = {}
) {
  return findShortestPath(
    graph,
    startId,
    targetId,
    options
  ) !== null;
}

/**
 * Kthen versionin e algoritmit.
 */
export function getPathFinderVersion() {
  return PATH_FINDER_VERSION;
}
