
/**
 * XSUS Hyper Core — Knowledge Graph Connected Components
 * Version: 1.0.0
 *
 * Identifikon komponentët e lidhur në Knowledge Graph.
 *
 * Drejtimet:
 * - outgoing: lidhjet nga sourceId te targetId.
 * - incoming: lidhjet nga targetId te sourceId.
 * - both: graf i trajtuar si i padrejtuar.
 *
 * Një komponent përmban të gjitha nyjet që mund të
 * arrihen nga njëra-tjetra sipas drejtimit të zgjedhur.
 */

export const CONNECTED_COMPONENTS_VERSION = "1.0.0";

const VALID_DIRECTIONS = new Set([
  "outgoing",
  "incoming",
  "both"
]);

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

function validateDirection(direction) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError("Invalid traversal direction.");
  }

  return direction;
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
 * Gjen komponentët e arritshëm sipas drejtimit.
 *
 * Në outgoing/incoming, rezultatet janë grupe
 * të nyjeve të arritshme nga secila nyje e papërpunuar.
 * Në grafet e drejtuara këto grupe mund të mbivendosen
 * ose të mos përfaqësojnë komponentë unikë matematikorë.
 *
 * Në both, rezultatet janë komponentë të lidhur
 * të grafit të trajtuar si i padrejtuar.
 */
export function findConnectedComponents(
  graph,
  options = {}
) {
  validateGraph(graph);

  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Invalid connected components options.");
  }

  const direction = validateDirection(
    options.direction ?? "both"
  );

  const adjacency = buildAdjacency(graph, direction);
  const visited = new Set();
  const components = [];

  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const component = [];
    const queue = [node.id];

    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift();

      component.push(currentId);

      for (const neighborId of adjacency.get(currentId) ?? []) {
        if (visited.has(neighborId)) {
          continue;
        }

        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    components.push(component);
  }

  return components;
}

/**
 * Kthen numrin e komponentëve.
 */
export function countConnectedComponents(
  graph,
  options = {}
) {
  return findConnectedComponents(
    graph,
    options
  ).length;
}

/**
 * Kontrollon nëse grafi është i lidhur.
 *
 * Grafi bosh konsiderohet i lidhur sipas
 * këtij kontrakti operacional.
 */
export function isConnectedGraph(
  graph,
  options = {}
) {
  const components = findConnectedComponents(
    graph,
    options
  );

  return components.length <= 1;
}

/**
 * Kthen versionin e algoritmit.
 */
export function getConnectedComponentsVersion() {
  return CONNECTED_COMPONENTS_VERSION;
}
