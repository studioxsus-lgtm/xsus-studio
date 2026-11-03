
/**
 * XSUS Hyper Core — Knowledge Graph Connected Components
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Identifikimi i komponentëve të lidhur.
 * - Llogaritja e arritshmërisë në grafe të drejtuara.
 * - Mbështetja e drejtimeve outgoing, incoming dhe both.
 * - Numërimi i komponentëve.
 * - Kontrollimi i lidhshmërisë së grafit.
 *
 * Drejtimet:
 * - outgoing: sourceId -> targetId.
 * - incoming: targetId -> sourceId.
 * - both: graf i trajtuar si i padrejtuar.
 *
 * Në outgoing/incoming:
 * Llogaritet grupi i arritshmërisë veçmas
 * për çdo nyje fillestare.
 *
 * Në both:
 * Kthehen komponentët unikë të lidhur.
 */

export const CONNECTED_COMPONENTS_VERSION = "1.0.0";

const VALID_DIRECTIONS = new Set([
  "outgoing",
  "incoming",
  "both"
]);

/**
 * Validon strukturën bazë të grafit.
 */
function validateGraph(graph) {
  if (
    !graph ||
    typeof graph !== "object" ||
    Array.isArray(graph) ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.links)
  ) {
    throw new TypeError("Invalid knowledge graph.");
  }

  const nodeIds = new Set();

  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node !== "object" ||
      Array.isArray(node) ||
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
      typeof link !== "object" ||
      Array.isArray(link) ||
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

/**
 * Validon drejtimin e kërkimit.
 */
function validateDirection(direction) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new TypeError("Invalid traversal direction.");
  }

  return direction;
}

/**
 * Validon opsionet e algoritmit.
 */
function validateOptions(options = {}) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      "Invalid connected components options."
    );
  }

  const direction = validateDirection(
    options.direction ?? "both"
  );

  return { direction };
}

/**
 * Ndërton adjacency list sipas drejtimit.
 */
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
 * Gjen të gjitha nyjet e arritshme nga një
 * nyje fillestare duke përdorur BFS.
 */
function findReachableNodes(startId, adjacency) {
  const visited = new Set([startId]);
  const reachable = [];
  const queue = [startId];

  let head = 0;

  while (head < queue.length) {
    const currentId = queue[head++];

    reachable.push(currentId);

    const neighbors = adjacency.get(currentId) ?? [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      queue.push(neighborId);
    }
  }

  return reachable;
}

/**
 * Gjen komponentët e lidhur ose grupet
 * e arritshmërisë sipas drejtimit.
 *
 * both:
 * - Komponentët unikë të grafit të padrejtuar.
 *
 * outgoing:
 * - Nyjet e arritshme nga secila nyje.
 *
 * incoming:
 * - Nyjet që mund të arrijnë secilën nyje.
 *
 * Rezultatet ruajnë rendin e nyjeve në graf.
 */
export function findConnectedComponents(
  graph,
  options = {}
) {
  validateGraph(graph);

  const { direction } = validateOptions(options);

  const adjacency = buildAdjacency(graph, direction);

  // Komponentët unikë të grafit të padrejtuar.
  if (direction === "both") {
    const visited = new Set();
    const components = [];

    for (const node of graph.nodes) {
      if (visited.has(node.id)) {
        continue;
      }

      const component = [];
      const queue = [node.id];

      visited.add(node.id);

      let head = 0;

      while (head < queue.length) {
        const currentId = queue[head++];

        component.push(currentId);

        const neighbors = adjacency.get(currentId) ?? [];

        for (const neighborId of neighbors) {
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

  // Në grafet e drejtuara çdo nyje ka
  // kërkimin e vet të pavarur.
  const components = [];

  for (const node of graph.nodes) {
    components.push(
      findReachableNodes(node.id, adjacency)
    );
  }

  return components;
}

/**
 * Kthen numrin e komponentëve ose grupeve
 * të arritshmërisë sipas drejtimit.
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
 * both:
 * Grafi është i lidhur nëse ka maksimumi
 * një komponent të padrejtuar.
 *
 * outgoing:
 * Çdo nyje duhet të arrijë të gjitha nyjet.
 *
 * incoming:
 * Të gjitha nyjet duhet të mund të arrijnë
 * secilën nyje.
 *
 * Për një graf të drejtuar, këto dy kushtet
 * janë ekuivalente me lidhshmërinë e fortë.
 *
 * Grafi bosh konsiderohet i lidhur.
 */
export function isConnectedGraph(
  graph,
  options = {}
) {
  const nodeIds = validateGraph(graph);
  const { direction } = validateOptions(options);

  if (nodeIds.size === 0) {
    return true;
  }

  const components = findConnectedComponents(
    graph,
    { direction }
  );

  if (direction === "both") {
    return components.length === 1;
  }

  const totalNodes = nodeIds.size;

  return components.every(
    (component) => component.length === totalNodes
  );
}

/**
 * Kthen versionin e algoritmit.
 */
export function getConnectedComponentsVersion() {
  return CONNECTED_COMPONENTS_VERSION;
}
