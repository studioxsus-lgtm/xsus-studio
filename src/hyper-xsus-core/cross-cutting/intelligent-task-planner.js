/** Deterministic task planner; no task execution or external side effects. */
import { createGraphDependencyOrderEngine } from "./graph-dependency-order-engine.js";
export const INTELLIGENT_TASK_PLANNER_VERSION = "1.0.0";
export function createIntelligentTaskPlanner({ maxTasks = 512 } = {}) {
  if (!Number.isSafeInteger(maxTasks) || maxTasks < 1 || maxTasks > 10000)
    throw new TypeError("Invalid task planner configuration.");
  const graph = createGraphDependencyOrderEngine({ maxNodes: maxTasks });
  function plan(tasks) {
    if (!Array.isArray(tasks) || tasks.length > maxTasks) throw new TypeError("Invalid tasks.");
    const nodes = tasks.map(t => {
      if (!t || typeof t.title !== "string" || !t.title.trim() || t.title.length > 256 ||
          !Number.isSafeInteger(t.cost) || t.cost < 1 || t.cost > 1000000)
        throw new TypeError("Invalid task specification.");
      return { id: t.id, dependsOn: t.dependsOn };
    });
    const ordered = graph.order(nodes).order;
    const byId = new Map(tasks.map(t => [t.id, t]));
    let totalCost = 0;
    const steps = ordered.map((id, index) => {
      const t = byId.get(id);
      totalCost += t.cost;
      if (!Number.isSafeInteger(totalCost)) throw new RangeError("Task cost overflow.");
      return Object.freeze({ sequence: index + 1, id, title: t.title,
        cost: t.cost, dependsOn: Object.freeze([...t.dependsOn]) });
    });
    return Object.freeze({ version: INTELLIGENT_TASK_PLANNER_VERSION,
      steps: Object.freeze(steps), totalCost, executable: false });
  }
  return Object.freeze({ version: INTELLIGENT_TASK_PLANNER_VERSION, plan });
}
