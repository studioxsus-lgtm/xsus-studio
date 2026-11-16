import { describe, expect, it } from "vitest";
import { createFiveEngineDiagnostics } from "../../src/hyper-xsus-core/cross-cutting/five-engine-diagnostics.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const request = {
  query: "secret customer query", evidence: [{ id: "doc", text: "secret customer query" }],
  facts: ["fact"], rules: [{ id: "rule", premises: ["fact"], conclusion: "derived" }],
  tasks: [{ id: "task", title: "private title", cost: 2, dependsOn: [] }],
  requests: [{ engine: "worker", payload: { token: "secret-credential" } }],
  qualityChecks: [{ name: "coherence", score: 1 }, { name: "completeness", score: 1 },
    { name: "safety", score: 1 }]
};
describe("Hyper XSUS Core — privacy-minimized workflow diagnostics", () => {
  it("reports completed workflow counters without leaking source content", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => ({ result: "secret-output" }) }
    ] });
    const result = createFiveEngineDiagnostics().summarize(await workflow.run(request));
    expect(result).toMatchObject({ status: "completed", evidenceCount: 1,
      inferenceSteps: 1, plannedTasks: 1, enginesCompleted: 1, enginesFailed: 0,
      qualityAccepted: true, executionAttempted: true });
    expect(JSON.stringify(result)).not.toMatch(/secret|private|credential/i);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it("reports quality rejection without claiming engine execution", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => ({ ok: true }) }
    ] });
    const result = createFiveEngineDiagnostics().summarize(await workflow.run({
      ...request, qualityChecks: []
    }));
    expect(result).toMatchObject({ status: "quality-rejected", enginesCompleted: 0,
      enginesFailed: 0, executionAttempted: false });
  });
  it("reports degraded workflow without exposing engine failure details", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { throw Error("secret exception"); } }
    ] });
    const result = createFiveEngineDiagnostics().summarize(await workflow.run(request));
    expect(result).toMatchObject({ status: "degraded", enginesFailed: 1 });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("rejects fabricated inconsistent success counters", () => {
    expect(() => createFiveEngineDiagnostics().summarize({
      status: "completed", semantic: { ranked: [] }, reasoning: { steps: [] },
      plan: { steps: [] }, quality: { accepted: true },
      coordination: { completed: 0, failed: 1, results: [{}] }
    })).toThrow("Inconsistent");
  });
  it("rejects invalid diagnostics configuration", () => {
    expect(() => createFiveEngineDiagnostics({ maxEngines: 0 })).toThrow("configuration");
  });
});
