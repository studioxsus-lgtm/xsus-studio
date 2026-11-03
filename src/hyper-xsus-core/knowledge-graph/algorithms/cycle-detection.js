
/**
 * Knowledge Graph Cycle Detection
 * XSUS Hyper Core
 * Version: 1.0.0
 *
 * Algorithms:
 * - Directed cycle detection
 * - Cycle node identification
 * - Acyclic graph verification
 */

export const CYCLE_DETECTION_VERSION = "1.0.0";

function validateGraph(graph) {
  if (
    graph === null ||
    typeof graph !== "object" ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.links)
  ) {
    throw new TypeError("Invalid Knowledge Graph.");
  }

  const nodeIds = new Set();

  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id.trim() ||
      nodeIds.has(node.id)
    ) {
      throw new TypeError("Invalid or duplicate graph node.");
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
}

function buildAdjacency(graph) {
  const adjacency = new Map();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const link of graph.links) {
    adjacency.get(link.sourceId).push(link.targetId);
  }

  return adjacency;
}

function analyzeCycles(graph) {
  validateGraph(graph);

  const adjacency = buildAdjacency(graph);
  const state = new Map();
  const parent = new Map();
  const cycles = [];
  const cycleKeys = new Set();
  const cycleNodes = new Set();

  function registerCycle(path) {
    if (path.length < 2) {
      return;
    }

    const cycle = [...path];

    const core = cycle.slice(0, -1);
    const rotations = core.map((_, index) => [
      ...core.slice(index),
      ...core.slice(0, index)
    ]);

    rotations.sort((a, b) =>
      a.join("\u0000").localeCompare(b.join("\u0000"))
    );

    const key = rotations[0].join("\u0000");

    if (!cycleKeys.has(key)) {
      cycleKeys.add(key);
      cycles.push(cycle);

      for (const nodeId of core) {
        cycleNodes.add(nodeId);
      }
    }
  }

  function visit(nodeId, stack) {
    state.set(nodeId, 1);
    stack.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const neighborState = state.get(neighbor) ?? 0;

      if (neighborState === 0) {
        parent.set(neighbor, nodeId);
        visit(neighbor, stack);
      } else if (neighborState === 1) {
        const cycleStart = stack.lastIndexOf(neighbor);

        if (cycleStart !== -1) {
          registerCycle([
            ...stack.slice(cycleStart),
            neighbor
          ]);
        }
      }
    }

    stack.pop();
    state.set(nodeId, 2);
  }

  for (const node of graph.nodes) {
    if (!state.has(node.id)) {
      visit(node.id, []);
    }
  }

  const selfLinks = graph.links
    .filter((link) => link.sourceId === link.targetId)
    .map((link) => link.sourceId);

  for (const nodeId of selfLinks) {
    cycleNodes.add(nodeId);
  }

  return {
    cycles,
    cycleNodes: [...cycleNodes],
    selfLinks,
    hasCycles: cycles.length > 0 || selfLinks.length > 0
  };
}

export function detectCycles(graph) {
  return analyzeCycles(graph).cycles;
}

export function getCycleNodes(graph) {
  return analyzeCycles(graph).cycleNodes;
}

export function hasCycles(graph) {
  return analyzeCycles(graph).hasCycles;
}

export function isAcyclicGraph(graph) {
  return !hasCycles(graph);
}

export function getCycleDetectionReport(graph) {
  return analyzeCycles(graph);
}
