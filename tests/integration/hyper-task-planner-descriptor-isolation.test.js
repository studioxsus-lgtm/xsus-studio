import { describe, expect, it } from "vitest";
import { createIntelligentTaskPlanner } from "../../src/hyper-xsus-core/cross-cutting/intelligent-task-planner.js";
const planner = createIntelligentTaskPlanner();
const valid = () => ({ id: "a", title: "Draft", cost: 2, dependsOn: [] });
describe("Hyper XSUS Core — task planner descriptor isolation", () => {
  it("rejects task field accessors without invoking them", () => {
    for (const name of ["id","title","cost","dependsOn"]) {
      let reads = 0;
      const task = valid();
      Object.defineProperty(task, name, { get() { reads++; return null; } });
      expect(() => planner.plan([task])).toThrow("specification");
      expect(reads).toBe(0);
    }
  });
  it("rejects task array element accessors without invoking them", () => {
    let reads = 0;
    const tasks = [valid()];
    Object.defineProperty(tasks, "0", { get() { reads++; return valid(); } });
    expect(() => planner.plan(tasks)).toThrow("specification");
    expect(reads).toBe(0);
  });
  it("rejects dependency array element accessors without invoking them", () => {
    let reads = 0;
    const task = valid();
    task.dependsOn = ["b"];
    Object.defineProperty(task.dependsOn, "0", { get() { reads++; return "b"; } });
    expect(() => planner.plan([task])).toThrow("dependency");
    expect(reads).toBe(0);
  });
  it("rejects inherited task fields", () => {
    const task = Object.create(valid());
    expect(() => planner.plan([task])).toThrow("specification");
  });
  it("preserves dependency order and critical path calculations", () => {
    const result = planner.plan([
      { id: "review", title: "Review", cost: 3, dependsOn: ["draft"] },
      { id: "draft", title: "Draft", cost: 2, dependsOn: [] }
    ]);
    expect(result.steps.map(s => s.id)).toEqual(["draft","review"]);
    expect(result.totalCost).toBe(5);
    expect(result.criticalPathCost).toBe(5);
  });
  it("accepts null-prototype task objects", () => {
    const task = Object.assign(Object.create(null), valid());
    const result = planner.plan([task]);
    expect(result.steps[0]).toMatchObject({ id: "a", earliestStart: 0, earliestFinish: 2 });
  });
});
