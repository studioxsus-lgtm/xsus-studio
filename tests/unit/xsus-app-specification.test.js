import { describe, expect, it } from "vitest";
import { createAppSpecification } from "../../assets/js/xsus-app/app-specification/index.js";

function completedResult(overrides = {}) {
  return {
    status: "completed",
    requestId: "req_spec_1",
    language: { core: "future-xsus-core", status: "unchanged", text: "Plan a task manager.", review_required: false },
    plan: {
      core: "hyper-xsus-core", goal: "Plan a task manager with projects, deadlines, and team boards.",
      state: "draft", executable: false, dependencyGraphValid: true,
      steps: [
        { id: "requirements", task: "List project requirements", dependsOn: [] },
        { id: "workflows", task: "Define task and deadline workflows", dependsOn: ["requirements"] }
      ]
    },
    safety: { executable: false, sideEffects: false },
    ...overrides
  };
}

describe("XSUS App specification adapter", () => {
  it("projects a verified task-manager plan into a reviewable specification", () => {
    const spec = createAppSpecification(completedResult());
    expect(spec.contractVersion).toBe("1.0.0");
    expect(spec.product.profileId).toBe("task-manager");
    expect(spec.requirements.map(item => item.text)).toEqual([
      "List project requirements", "Define task and deadline workflows"
    ]);
    expect(spec.proposedStructure.pages).toContain("Team board");
    expect(spec.proposedStructure.dataModels).toContain("Task");
    expect(spec.review).toEqual({ requiredBeforeImplementation: true, acceptedByUser: false });
    expect(spec.safety).toEqual({ codeGenerated: false, codeExecuted: false, persisted: false, deployed: false });
    expect(Object.isFrozen(spec.proposedStructure.pages)).toBe(true);
  });

  it("keeps unknown product types generic instead of inventing domain details", () => {
    const result = completedResult();
    result.plan.goal = "Create a personal recipe notebook.";
    const spec = createAppSpecification(result);
    expect(spec.product.profileId).toBe("general");
    expect(spec.proposedStructure.pages).toEqual([]);
    expect(spec.openQuestions.length).toBeGreaterThan(0);
  });

  it.each([
    ["Plan a booking platform with a calendar and customer dashboard.", "booking", "Availability calendar"],
    ["Plan an online store with products, a cart and checkout.", "online-store", "Shopping cart"]
  ])("maps the supported %s goal to its own proposed profile", (goal, profileId, page) => {
    const result = completedResult();
    result.plan.goal = goal;
    const spec = createAppSpecification(result);
    expect(spec.product.profileId).toBe(profileId);
    expect(spec.proposedStructure.pages).toContain(page);
  });

  it("rejects plans that still require language review", () => {
    const result = completedResult({
      status: "review_required",
      language: { core: "future-xsus-core", status: "review_required", text: "Uncertain.", review_required: true }
    });
    expect(() => createAppSpecification(result)).toThrow("completed, safe Hyper–Future planning result");
  });

  it("rejects executable, cyclic or dangling-dependency plans", () => {
    const executable = completedResult();
    executable.plan.executable = true;
    expect(() => createAppSpecification(executable)).toThrow();

    const cyclic = completedResult();
    cyclic.plan.steps[0].dependsOn = ["workflows"];
    expect(() => createAppSpecification(cyclic)).toThrow();

    const unknownDependency = completedResult();
    unknownDependency.plan.steps[1].dependsOn = ["missing"];
    expect(() => createAppSpecification(unknownDependency)).toThrow();
  });

  it("preserves a valid dependency graph even when steps are not topologically listed", () => {
    const result = completedResult();
    result.plan.steps[0].dependsOn = ["workflows"];
    result.plan.steps[1].dependsOn = [];
    expect(createAppSpecification(result).requirements[0].dependsOn).toEqual(["workflows"]);
  });
});
