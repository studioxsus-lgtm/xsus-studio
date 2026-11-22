import { describe, it, expect } from "vitest";
import { createAppSpecification } from "../../assets/js/xsus-app/app-specification/index.js";

const draft = {
  status: "review_required",
  requestId: "review-123",
  language: { core: "future-xsus-core", status: "review_required", text: "Build a task management app.", review_required: true },
  plan: {
    core: "hyper-xsus-core", state: "draft", goal: "Build a task management app.",
    executable: false, dependencyGraphValid: true, proposalSource: "hyper-xsus-core/deterministic-planner",
    steps: [{ id: "step-1", task: "Define requirements", dependsOn: [] }]
  },
  safety: { executable: false, sideEffects: false }
};

describe("Human-reviewed Hyper planning drafts", () => {
  it("blocks unreviewed drafts", () => {
    expect(() => createAppSpecification(draft)).toThrow();
  });
  it("allows explicitly reviewed safe drafts without enabling execution", () => {
    const spec = createAppSpecification(draft, { humanReviewed: true });
    expect(spec.product.profileId).toBe("task-manager");
    expect(spec.requirements[0].source).toBe("hyper-proposed-plan");
    expect(spec.review.acceptedByUser).toBe(false);
    expect(spec.safety.codeExecuted).toBe(false);
    expect(spec.safety.deployed).toBe(false);
  });
  it("still rejects unsafe or invalid dependency graphs after review", () => {
    expect(() => createAppSpecification({ ...draft, safety: { executable: true, sideEffects: false } }, { humanReviewed: true })).toThrow();
    expect(() => createAppSpecification({ ...draft, plan: { ...draft.plan, steps: [{ id: "step-1", task: "Unsafe", dependsOn: ["step-1"] }] } }, { humanReviewed: true })).toThrow();
  });
});
