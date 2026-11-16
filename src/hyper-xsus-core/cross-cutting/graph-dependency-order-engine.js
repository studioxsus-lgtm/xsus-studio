/** Deterministic dependency ordering with cycle and unknown-node rejection. */
export const GRAPH_DEPENDENCY_ORDER_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createGraphDependencyOrderEngine({ maxNodes = 10000 } = {}) {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000)
    throw new TypeError("Invalid dependency order configuration.");
  function order(nodes) {
    if (!Array.isArray(nodes) || nodes.length > maxNodes) throw new TypeError("Invalid dependency nodes.");
    const graph = new Map();
    for (const node of nodes) {
      if (!node || typeof node.id !== "string" || !ID.test(node.id) ||
          graph.has(node.id) || !Array.isArray(node.dependsOn) ||
          node.dependsOn.length > maxNodes) throw new TypeError("Invalid dependency node.");
      const deps = new Set();
      for (const dep of node.dependsOn) {
        if (typeof dep !== "string" || !ID.test(dep) || deps.has(dep))
          throw new TypeError("Invalid dependency reference.");
        deps.add(dep);
      }
      graph.set(node.id, deps);
    }
    const result = [], visited = new Set(), visiting = new Set();
    function visit(id) {
      if (!graph.has(id)) throw new Error("Unknown dependency: " + id);
      if (visiting.has(id)) throw new Error("Dependency cycle detected.");
      if (visited.has(id)) return;
      visiting.add(id);
      for (const dep of [...graph.get(id)].sort()) visit(dep);
      visiting.delete(id);
      visited.add(id); result.push(id);
    }
    for (const id of [...graph.keys()].sort()) visit(id);
    return Object.freeze({ version: GRAPH_DEPENDENCY_ORDER_VERSION,
      order: Object.freeze(result), readOnly: true });
  }
  return Object.freeze({ version: GRAPH_DEPENDENCY_ORDER_VERSION, order });
}
