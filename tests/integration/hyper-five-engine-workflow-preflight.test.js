import { describe, expect, it } from "vitest";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const base = {
  query: "evidence", evidence: [], facts: [], rules: [], tasks: [],
  qualityChecks: [
    { name: "coherence", score: 1 },
    { name: "completeness", score: 1 },
    { name: "safety", score: 1 }
  ]
};
describe("Hyper XSUS Core — specialist preflight and workflow safety", () => {
  it("preflight rejects duplicate engines without any execution", () => {
    let calls = 0;
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "a", execute: async () => { calls++; return {}; } }
    ] });
    expect(() => coordinator.validateRequests([
      { engine: "a", payload: {} }, { engine: "a", payload: {} }
    ])).toThrow("request");
    expect(calls).toBe(0);
  });
  it("preflight returns deeply sanitized immutable payloads", () => {
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "a", execute: async x => x }
    ] });
    const original = { nested: { count: 1 } };
    const requests = coordinator.validateRequests([{ engine: "a", payload: original }]);
    original.nested.count = 99;
    expect(requests[0].payload.nested.count).toBe(1);
    expect(Object.isFrozen(requests)).toBe(true);
    expect(Object.isFrozen(requests[0].payload.nested)).toBe(true);
  });
  it("workflow rejects invalid engine requests even when quality evidence is missing", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "a", execute: async () => { calls++; return {}; } }
    ] });
    await expect(workflow.run({
      ...base, qualityChecks: [], requests: [
        { engine: "a", payload: {} }, { engine: "a", payload: {} }
      ]
    })).rejects.toThrow("request");
    expect(calls).toBe(0);
  });
  it("workflow rejects unsupported engine before any execution", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "a", execute: async () => { calls++; return {}; } }
    ] });
    await expect(workflow.run({ ...base, requests: [
      { engine: "missing", payload: {} }
    ] })).rejects.toThrow("request");
    expect(calls).toBe(0);
  });
  it("valid quality and valid requests preserve completed workflow", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "a", execute: async payload => ({ value: payload.value }) }
    ] });
    const result = await workflow.run({ ...base, requests: [
      { engine: "a", payload: { value: 7 } }
    ] });
    expect(result.status).toBe("completed");
    expect(result.coordination.results[0].output.value).toBe(7);
  });
});
