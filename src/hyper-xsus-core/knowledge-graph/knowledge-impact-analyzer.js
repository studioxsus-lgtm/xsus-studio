/**
 * Hyper XSUS Core — Knowledge Change Impact Analyzer v1.0.0
 *
 * Read-only, bounded, deterministic analysis of the downstream/upstream
 * consequences of removing or changing knowledge nodes.
 * Does not mutate the source graph or perform writes.
 */
import { createKnowledgeGraph } from "./models/knowledge-graph.model.js";

export const KNOWLEDGE_IMPACT_ANALYZER_VERSION = "1.0.0";

function validateOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Impact options must be a plain object.");
  }
  const direction = options.direction ?? "outgoing";
  const maxDepth = options.maxDepth ?? 8;
  const maxAffectedNodes = options.maxAffectedNodes ?? 1000;
  if (!["outgoing", "incoming", "both"].includes(direction)) {
    throw new TypeError("Invalid impact direction.");
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 100) {
    throw new TypeError("maxDepth must be an integer from 0 to 100.");
  }
  if (!Number.isInteger(maxAffectedNodes) || maxAffectedNodes < 1 || maxAffectedNodes > 10000) {
    throw new TypeError("maxAffectedNodes must be an integer from 1 to 10000.");
  }
  return { direction, maxDepth, maxAffectedNodes };
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}

function buildAdjacency(graph, direction) {
  const adjacency = new Map(graph.nodes.map(node => [node.id, new Set()]));
  for (const link of graph.links) {
    if (direction !== "incoming") adjacency.get(link.sourceId).add(link.targetId);
    if (direction !== "outgoing") adjacency.get(link.targetId).add(link.sourceId);
  }
  return adjacency;
}

function validateRoots(graph, nodeIds) {
  if (!Array.isArray(nodeIds) || nodeIds.length < 1 || nodeIds.length > 1000) {
    throw new TypeError("nodeIds must contain 1 to 1000 node IDs.");
  }
  const valid = new Set(graph.nodes.map(node => node.id));
  const seen = new Set();
  for (const id of nodeIds) {
    if (typeof id !== "string" || !id.trim() || id !== id.trim()) {
      throw new TypeError("Invalid impact node ID.");
    }
    if (seen.has(id)) throw new TypeError("Duplicate impact node ID.");
    if (!valid.has(id)) throw new Error("Impact node not found.");
    seen.add(id);
  }
  return seen;
}

/**
 * Returns a deterministic impact report. affectedNodes excludes root nodes;
 * roots are returned separately. Parallel edges are counted individually.
 *
 * truncated means at least one reachable node could not be included due to
 * maxAffectedNodes. maxDepth intentionally bounds traversal and is reported.
 */
export function analyzeKnowledgeImpact(graphInput, nodeIds, options = {}) {
  const graph = createKnowledgeGraph(graphInput);
  const config = validateOptions(options);
  const roots = validateRoots(graph, nodeIds);
  const adjacency = buildAdjacency(graph, config.direction);
  const visited = new Set(roots);
  const queue = [...roots].map(id => ({ id, depth: 0 }));
  const affectedNodes = [];
  let truncated = false;
  let maxObservedDepth = 0;

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.depth >= config.maxDepth) continue;
    for (const neighbor of adjacency.get(current.id)) {
      if (visited.has(neighbor)) continue;
      if (affectedNodes.length >= config.maxAffectedNodes) {
        truncated = true;
        break;
      }
      visited.add(neighbor);
      const depth = current.depth + 1;
      maxObservedDepth = Math.max(maxObservedDepth, depth);
      affectedNodes.push({ id: neighbor, depth, via: current.id });
      queue.push({ id: neighbor, depth });
    }
    if (truncated) break;
  }

  const affectedIds = new Set([...roots, ...affectedNodes.map(item => item.id)]);
  const incidentLinks = graph.links.filter(link =>
    affectedIds.has(link.sourceId) || affectedIds.has(link.targetId)
  );
  const directlyRemovedLinks = graph.links.filter(link =>
    roots.has(link.sourceId) || roots.has(link.targetId)
  );

  return freeze({
    version: KNOWLEDGE_IMPACT_ANALYZER_VERSION,
    graphId: graph.id,
    direction: config.direction,
    maxDepth: config.maxDepth,
    maxAffectedNodes: config.maxAffectedNodes,
    roots: [...roots],
    affectedNodes,
    affectedCount: affectedNodes.length,
    maxObservedDepth,
    truncated,
    incidentLinkIds: incidentLinks.map(link => link.id),
    directlyRemovedLinkIds: directlyRemovedLinks.map(link => link.id),
    directlyRemovedLinkCount: directlyRemovedLinks.length
  });
}

/**
 * Preflight a proposed node removal without changing the graph. Returns a
 * valid, isolated graph snapshot representing the resulting deletion.
 */
export function previewKnowledgeNodeRemoval(graphInput, nodeIds, options = {}) {
  const graph = createKnowledgeGraph(graphInput);
  const impact = analyzeKnowledgeImpact(graph, nodeIds, options);
  const removed = new Set(impact.roots);
  const proposedGraph = createKnowledgeGraph({
    ...graph,
    nodes: graph.nodes.filter(node => !removed.has(node.id)),
    links: graph.links.filter(link =>
      !removed.has(link.sourceId) && !removed.has(link.targetId)
    )
  });
  return freeze({ impact, proposedGraph });
}

/**
 * Bind analysis to an existing Knowledge Graph API without owning its state.
 * Each call reads a fresh snapshot; no stale graph cache.
 */
export function createKnowledgeImpactAnalyzer(graphAPI) {
  if (!graphAPI || typeof graphAPI.getGraph !== "function") {
    throw new TypeError("graphAPI must expose getGraph().");
  }
  return Object.freeze({
    version: KNOWLEDGE_IMPACT_ANALYZER_VERSION,
    analyze(nodeIds, options) {
      return analyzeKnowledgeImpact(graphAPI.getGraph(), nodeIds, options);
    },
    previewRemoval(nodeIds, options) {
      return previewKnowledgeNodeRemoval(graphAPI.getGraph(), nodeIds, options);
    }
  });
}
