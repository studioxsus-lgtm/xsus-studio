
/**
 * Knowledge Graph Traversal
 * XSUS Hyper Core
 * Version: 1.0.0
 *
 * Algorithms:
 * - Breadth-First Search (BFS)
 * - Depth-First Search (DFS)
 *
 * Graph-i trajtohet si i drejtuar.
 * Ciklet trajtohen përmes visited Set.
 */

export const GRAPH_TRAVERSAL_VERSION = "1.0.0";

function validateGraph(graph) {
  if (
    graph === null ||
    typeof graph !== "object" ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.links)
  ) {
    throw new TypeError("Invalid Knowledge Graph.");
  }
}

function validateStartNode(graph, startNodeId) {
  if (
    typeof startNodeId !== "string" ||
    !startNodeId.trim()
  ) {
    throw new TypeError("startNodeId must be a non-empty string.");
  }

  const exists = graph.nodes.some(
    (node) => node.id === startNodeId
  );

  if (!exists) {
    throw new Error(`Node not found: ${startNodeId}`);
  }
}

function buildAdjacency(graph, direction) {
  const adjacency = new Map();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const link of graph.links) {
    if (direction === "outgoing" || direction === "both") {
      adjacency.get(link.sourceId)?.push(link.targetId);
    }

    if (direction === "incoming" || direction === "both") {
      adjacency.get(link.targetId)?.push(link.sourceId);
    }
  }

  return adjacency;
}

function normalizeOptions(options = {}) {
  const direction = options.direction ?? "outgoing";
  const maxDepth = options.maxDepth ?? Infinity;

  if (!["outgoing", "incoming", "both"].includes(direction)) {
    throw new TypeError("Invalid traversal direction.");
  }

  if (
    maxDepth !== Infinity &&
    (!Number.isInteger(maxDepth) || maxDepth < 0)
  ) {
    throw new TypeError("maxDepth must be a non-negative integer.");
  }

  return { direction, maxDepth };
}

export function breadthFirstSearch(
  graph,
  startNodeId,
  options = {}
) {
  validateGraph(graph);
  validateStartNode(graph, startNodeId);

  const { direction, maxDepth } = normalizeOptions(options);
  const adjacency = buildAdjacency(graph, direction);

  const visited = new Set([startNodeId]);
  const queue = [{ id: startNodeId, depth: 0 }];
  const result = [];

  while (queue.length > 0) {
    const current = queue.shift();

    result.push({
      nodeId: current.id,
      depth: current.depth
    });

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const neighbor of adjacency.get(current.id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);

        queue.push({
          id: neighbor,
          depth: current.depth + 1
        });
      }
    }
  }

  return result;
}

export function depthFirstSearch(
  graph,
  startNodeId,
  options = {}
) {
  validateGraph(graph);
  validateStartNode(graph, startNodeId);

  const { direction, maxDepth } = normalizeOptions(options);
  const adjacency = buildAdjacency(graph, direction);

  const visited = new Set();
  const result = [];
  const stack = [{ id: startNodeId, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();

    if (visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);

    result.push({
      nodeId: current.id,
      depth: current.depth
    });

    if (current.depth >= maxDepth) {
      continue;
    }

    const neighbors = adjacency.get(current.id) ?? [];

    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index];

      if (!visited.has(neighbor)) {
        stack.push({
          id: neighbor,
          depth: current.depth + 1
        });
      }
    }
  }

  return result;
}

export function getReachableNodeIds(
  graph,
  startNodeId,
  options = {}
) {
  return breadthFirstSearch(
    graph,
    startNodeId,
    options
  ).map((item) => item.nodeId);
}
