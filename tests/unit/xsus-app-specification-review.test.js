import { describe, expect, it } from "vitest";
import { createAppSpecification } from "../../assets/js/xsus-app/app-specification/index.js";
import {
  approveSpecificationReviewDraft,
  createSpecificationReviewDraft,
  parseSpecificationList,
  validateSpecificationReviewDraft
} from "../../assets/js/xsus-app/app-specification/review.js";

function draft() {
  const source = {
    status: "completed",
    requestId: "req_review_1",
    language: { core: "future-xsus-core", status: "unchanged", text: "Plan a task manager.", review_required: false },
    plan: {
      core: "hyper-xsus-core", goal: "Plan a task manager with projects and deadlines.",
      state: "draft", executable: false, dependencyGraphValid: true,
      steps: [{ id: "requirements", task: "List project requirements", dependsOn: [] }]
    },
    safety: { executable: false, sideEffects: false }
  };
  return createSpecificationReviewDraft(createAppSpecification(source));
}

describe("XSUS App specification review draft", () => {
  it("copies the immutable recommendation into editable temporary lists", () => {
    const source = createAppSpecification({
      status: "completed", requestId: "req_review_2",
      language: { core: "future-xsus-core", status: "unchanged", text: "Plan a task manager.", review_required: false },
      plan: { core: "hyper-xsus-core", goal: "Plan a task manager.", state: "draft", executable: false, dependencyGraphValid: true,
        steps: [{ id: "requirements", task: "List project requirements", dependsOn: [] }] },
      safety: { executable: false, sideEffects: false }
    });
    const editable = createSpecificationReviewDraft(source);
    editable.proposedStructure.pages.push("Reports");
    expect(source.proposedStructure.pages).not.toContain("Reports");
  });

  it("parses and validates one item per line", () => {
    expect(parseSpecificationList(" Home \n\n Reports\r\n")).toEqual(["Home", "Reports"]);
    expect(validateSpecificationReviewDraft(draft())).toEqual([]);
  });

  it("requires at least one screen and a user requirement before approval", () => {
    const empty = draft();
    empty.proposedStructure.pages = [];
    empty.requirements = [];
    expect(validateSpecificationReviewDraft(empty)).toEqual(["pages_required", "requirements_required"]);
    expect(approveSpecificationReviewDraft(empty)).toMatchObject({ ok: false });
  });

  it("records explicit approval while keeping all implementation effects disabled", () => {
    const result = approveSpecificationReviewDraft(draft());
    expect(result.ok).toBe(true);
    expect(result.specification.state).toBe("approved_for_next_phase");
    expect(result.specification.review).toEqual({ requiredBeforeImplementation: false, acceptedByUser: true });
    expect(result.specification.safety).toEqual({ codeGenerated: false, codeExecuted: false, persisted: false, deployed: false });
  });
});
