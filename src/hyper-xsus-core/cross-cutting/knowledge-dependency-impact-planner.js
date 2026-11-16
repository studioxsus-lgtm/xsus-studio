/**
 * Hyper XSUS Core — Knowledge Dependency Impact Planner v1.0.0
 * Combines deterministic node diffs with a validated dependency graph.
 * Read-only; no graph mutation or implicit recovery.
 */
import { createGraphChangeSetEngine } from "./graph-change-set-engine.js";
import { createGraphDependencyOrderEngine } from "./graph-dependency-order-engine.js";
export const KNOWLEDGE_DEPENDENCY_IMPACT_VERSION = "1.0.0";
export function createKnowledgeDependencyImpactPlanner({ maxNodes = 10000 } = {}) {
  const changes = createGraphChangeSetEngine({ maxNodes });
  const dependencies = createGraphDependencyOrderEngine({ maxNodes });
  function plan({ before, after, dependencyNodes } = {}) {
    const changeSet = changes.compare(before, after);
    const order = dependencies.order(dependencyNodes).order;
    const afterIds = new Set(after.map(node => node.id));
    const orderIds = new Set(order);
    if (orderIds.size !== afterIds.size ||
        [...orderIds].some(id => !afterIds.has(id)))
      throw new TypeError("Dependency graph must match the current snapshot.");
    const removed = new Set(changeSet.removed);
    const changed = new Set([...changeSet.added, ...changeSet.revised]);
    // Removed dependencies are absent from the current graph. A surviving node
    // must not silently retain a reference to a removed dependency.
    for (const node of dependencyNodes) {
      if (node.dependsOn.some(dep => removed.has(dep)))
        throw new TypeError("Current dependency graph references removed nodes.");
    }
    const affected = new Set(changed);
    const nodeMap = new Map(dependencyNodes.map(node => [node.id, node.dependsOn]));
    for (const id of order) {
      if (nodeMap.get(id).some(dep => affected.has(dep))) affected.add(id);
    }
    const rebuildOrder = Object.freeze(order.filter(id => affected.has(id)));
    return Object.freeze({
      version: KNOWLEDGE_DEPENDENCY_IMPACT_VERSION, changeSet,
      rebuildOrder, affectedCount: rebuildOrder.length,
      removed: changeSet.removed, readOnly: true, automaticExecution: false
    });
  }
  return Object.freeze({ version: KNOWLEDGE_DEPENDENCY_IMPACT_VERSION, plan });
}
