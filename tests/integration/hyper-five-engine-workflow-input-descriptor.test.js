import { describe, expect, it } from "vitest";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
function setup() {
  let calls = 0;
  const workflow = createFiveEngineWorkflow({ engines: [
    { name: "worker", execute: async () => { calls++; return { ok: true }; } }
  ] });
  return { workflow, get calls() { return calls; } };
}
describe("Hyper XSUS Core — workflow top-level descriptor admission", () => {
  it("rejects query accessors without reading them or executing specialists", async () => {
    const state = setup();
    let reads = 0;
    const input = {};
    Object.defineProperty(input, "query", { get() { reads++; return "hello"; } });
    await expect(state.workflow.run(input)).rejects.toThrow("accessor");
    expect(reads).toBe(0);
    expect(state.calls).toBe(0);
  });
  it("rejects accessors across all stage inputs before execution", async () => {
    for (const field of ["evidence","facts","rules","tasks","requests","qualityChecks","findings"]) {
      const state = setup();
      let reads = 0;
      const input = { query: "hello" };
      Object.defineProperty(input, field, { get() { reads++; return []; } });
      await expect(state.workflow.run(input)).rejects.toThrow("accessor");
      expect(reads).toBe(0);
      expect(state.calls).toBe(0);
    }
  });
  it("rejects inherited fields and non-plain top-level objects", async () => {
    const state = setup();
    const input = Object.create({ query: "hello" });
    await expect(state.workflow.run(input)).rejects.toThrow("input");
    await expect(state.workflow.run([])).rejects.toThrow("input");
    expect(state.calls).toBe(0);
  });
  it("accepts valid null-prototype input and executes a specialist", async () => {
    const state = setup();
    const input = Object.assign(Object.create(null), {
      query: "hello", qualityChecks: checks,
      requests: [{ engine: "worker", payload: {} }]
    });
    const result = await state.workflow.run(input);
    expect(result.status).toBe("completed");
    expect(state.calls).toBe(1);
  });
  it("rejects an unsafe quality field even if earlier stages are otherwise valid", async () => {
    const state = setup();
    let reads = 0;
    const input = {
      query: "hello", requests: [{ engine: "worker", payload: {} }]
    };
    Object.defineProperty(input, "qualityChecks", {
      get() { reads++; return checks; }
    });
    await expect(state.workflow.run(input)).rejects.toThrow("accessor");
    expect(reads).toBe(0);
    expect(state.calls).toBe(0);
  });
});
