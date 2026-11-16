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
    // Iterative topological sort avoids stack overflow for deep dependency graphs.
    const dependents = new Map([...graph.keys()].map(id => [id, []]));
    const indegree = new Map();
    for (const [id, deps] of graph) {
      indegree.set(id, deps.size);
      for (const dep of deps) {
        if (!graph.has(dep)) throw new Error("Unknown dependency: " + dep);
        dependents.get(dep).push(id);
      }
    }
    const ready = [...graph.keys()].filter(id => indegree.get(id) === 0).sort();
    const result = [];
    while (ready.length > 0) {
      const id = ready.shift();
      result.push(id);
      for (const next of dependents.get(id)) {
        const remaining = indegree.get(next) - 1;
        indegree.set(next, remaining);
        if (remaining === 0) {
          ready.push(next);
          ready.sort();
        }
      }
    }
    if (result.length !== graph.size) throw new Error("Dependency cycle detected.");
    return Object.freeze({ version: GRAPH_DEPENDENCY_ORDER_VERSION,
      order: Object.freeze(result), readOnly: true });
  }
  return Object.freeze({ version: GRAPH_DEPENDENCY_ORDER_VERSION, order });
}
