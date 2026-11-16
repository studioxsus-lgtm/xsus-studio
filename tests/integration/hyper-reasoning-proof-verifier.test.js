import { describe, expect, it } from "vitest";
import { createReasoningProofVerifier } from "../../src/hyper-xsus-core/cross-cutting/reasoning-proof-verifier.js";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const facts = ["a"];
const rules = [
  { id: "r1", premises: ["a"], conclusion: "b" },
  { id: "r2", premises: ["b"], conclusion: "c" }
];
const engine = createMultiStepReasoningEngine();
const verifier = createReasoningProofVerifier();
describe("Hyper XSUS Core — reasoning proof verification", () => {
  it("accepts a genuine multi-step derivation", () => {
    const proof = engine.reason({ facts, rules });
    expect(verifier.verify({ facts, rules, proof })).toMatchObject({
      verified: true, stepCount: 2, failureIndex: null, factualTruthVerified: false
    });
  });
  it("rejects a forged conclusion", () => {
    const proof = engine.reason({ facts, rules });
    const forged = { ...proof, steps: [
      { ...proof.steps[0], conclusion: "fake" }, proof.steps[1]
    ] };
    expect(verifier.verify({ facts, rules, proof: forged })).toMatchObject({
      verified: false, failureIndex: 0
    });
  });
  it("rejects an unsupported derivation order", () => {
    const proof = engine.reason({ facts, rules });
    expect(verifier.verify({ facts, rules, proof: {
      ...proof, steps: [...proof.steps].reverse()
    } }).verified).toBe(false);
  });
  it("rejects a forged final fact set", () => {
    const proof = engine.reason({ facts, rules });
    expect(verifier.verify({ facts, rules, proof: {
      ...proof, facts: ["a", "b", "c", "invented"]
    } }).verified).toBe(false);
  });
  it("accepts an incomplete but valid bounded proof", () => {
    const proof = createMultiStepReasoningEngine({ maxRounds: 1 }).reason({ facts, rules });
    expect(proof.incomplete).toBe(true);
    expect(verifier.verify({ facts, rules, proof }).verified).toBe(true);
  });
  it("rejects duplicate rules and malformed proof input", () => {
    const proof = engine.reason({ facts, rules });
    expect(() => verifier.verify({ facts, rules: [...rules, rules[0]], proof }))
      .toThrow("rule");
    expect(() => verifier.verify({ facts, rules, proof: null })).toThrow("input");
  });
  it("preserves normal five-engine workflow behavior after proof verification", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { calls++; return { ok: true }; } }
    ] });
    const result = await workflow.run({
      query: "reason", facts, rules, requests: [{ engine: "worker", payload: {} }],
      qualityChecks: ["coherence", "completeness", "safety"].map(name => ({ name, score: 1 }))
    });
    expect(result.status).toBe("completed");
    expect(result.reasoning.facts).toEqual(["a", "b", "c"]);
    expect(calls).toBe(1);
  });
});
