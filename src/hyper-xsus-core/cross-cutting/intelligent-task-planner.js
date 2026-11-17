/** Deterministic task planner; no task execution or external side effects. */
import { createGraphDependencyOrderEngine } from "./graph-dependency-order-engine.js";
export const INTELLIGENT_TASK_PLANNER_VERSION = "1.0.0";
export function createIntelligentTaskPlanner({ maxTasks = 512 } = {}) {
  if (!Number.isSafeInteger(maxTasks) || maxTasks < 1 || maxTasks > 10000)
    throw new TypeError("Invalid task planner configuration.");
  const graph = createGraphDependencyOrderEngine({ maxNodes: maxTasks });
  function plan(tasks) {
    if (!Array.isArray(tasks) || tasks.length > maxTasks) throw new TypeError("Invalid tasks.");
    const prepared = Array.from({ length: tasks.length }, (_, index) => {
      const entry = Object.getOwnPropertyDescriptor(tasks, String(index));
      if (!entry || !Object.hasOwn(entry, "value"))
        throw new TypeError("Invalid task specification.");
      const task = entry.value;
      if (!task || typeof task !== "object" || Array.isArray(task) ||
          (Object.getPrototypeOf(task) !== Object.prototype && Object.getPrototypeOf(task) !== null))
        throw new TypeError("Invalid task specification.");
      const fields = Object.create(null);
      for (const name of ["id", "title", "cost", "dependsOn"]) {
        const descriptor = Object.getOwnPropertyDescriptor(task, name);
        if (!descriptor || !Object.hasOwn(descriptor, "value"))
          throw new TypeError("Invalid task specification.");
        fields[name] = descriptor.value;
      }
      if (typeof fields.title !== "string" || !fields.title.trim() ||
          fields.title.length > 256 || !Number.isSafeInteger(fields.cost) ||
          fields.cost < 1 || fields.cost > 1000000 ||
          !Array.isArray(fields.dependsOn))
        throw new TypeError("Invalid task specification.");
      const dependsOn = Array.from({ length: fields.dependsOn.length }, (_, i) => {
        const descriptor = Object.getOwnPropertyDescriptor(fields.dependsOn, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, "value"))
          throw new TypeError("Invalid task dependency.");
        return descriptor.value;
      });
      return { id: fields.id, title: fields.title, cost: fields.cost, dependsOn };
    });
    const nodes = prepared.map(({ id, dependsOn }) => ({ id, dependsOn }));
    const ordered = graph.order(nodes).order;
    const byId = new Map(prepared.map(t => [t.id, t]));
    let totalCost = 0;
    const finishAt = new Map();
    const steps = ordered.map((id, index) => {
      const t = byId.get(id);
      totalCost += t.cost;
      if (!Number.isSafeInteger(totalCost)) throw new RangeError("Task cost overflow.");
      const earliestStart = t.dependsOn.reduce((max, dep) => Math.max(max, finishAt.get(dep)), 0);
      const earliestFinish = earliestStart + t.cost;
      if (!Number.isSafeInteger(earliestFinish)) throw new RangeError("Task schedule overflow.");
      finishAt.set(id, earliestFinish);
      return Object.freeze({ sequence: index + 1, id, title: t.title,
        cost: t.cost, earliestStart, earliestFinish,
        dependsOn: Object.freeze([...t.dependsOn]) });
    });
    return Object.freeze({ version: INTELLIGENT_TASK_PLANNER_VERSION,
      steps: Object.freeze(steps), totalCost,
      criticalPathCost: Math.max(0, ...finishAt.values()), executable: false });
  }
  return Object.freeze({ version: INTELLIGENT_TASK_PLANNER_VERSION, plan });
}
