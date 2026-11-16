import { describe, expect, it } from "vitest";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
describe("Hyper XSUS Core — snapshot reasoning round boundaries", () => {
  const chain = [
    { id: "r1", premises: ["f0"], conclusion: "f1" },
    { id: "r2", premises: ["f1"], conclusion: "f2" },
    { id: "r3", premises: ["f2"], conclusion: "f3" }
  ];
  it("derives at most one dependency level per round", () => {
    const result = createMultiStepReasoningEngine({ maxRounds: 2 })
      .reason({ facts: ["f0"], rules: chain });
    expect(result.facts).toEqual(["f0", "f1", "f2"]);
    expect(result.rounds).toBe(2);
    expect(result.incomplete).toBe(true);
  });
  it("is independent of rule insertion order at a fixed round limit", () => {
    const engine = createMultiStepReasoningEngine({ maxRounds: 2 });
    const forward = engine.reason({ facts: ["f0"], rules: chain });
    const backward = engine.reason({ facts: ["f0"], rules: [...chain].reverse() });
    expect(forward.facts).toEqual(backward.facts);
    expect(forward.steps).toEqual(backward.steps);
    expect(forward.incomplete).toBe(backward.incomplete);
  });
  it("completes a chain with enough rounds", () => {
    const result = createMultiStepReasoningEngine({ maxRounds: 4 })
      .reason({ facts: ["f0"], rules: chain });
    expect(result.facts).toEqual(["f0", "f1", "f2", "f3"]);
    expect(result.incomplete).toBe(false);
  });
  it("does not mutate supplied facts or rules", () => {
    const rules = chain.map(rule => ({ ...rule, premises: [...rule.premises] }));
    const facts = ["f0"];
    createMultiStepReasoningEngine({ maxRounds: 2 }).reason({ facts, rules });
    expect(facts).toEqual(["f0"]);
    expect(rules).toEqual(chain);
  });
});
