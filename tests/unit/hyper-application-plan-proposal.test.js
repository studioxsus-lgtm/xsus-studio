import { describe, it, expect } from "vitest";
import { proposeApplicationPlan } from "../../src/hyper-xsus-core/next-engines/strategic-planning/index.js";

describe("Hyper application goal planning", () => {
  it.each([
    ["Build a modern task management application with user accounts, projects, tasks, deadlines, and progress tracking.", "task-management"],
    ["Create a task manager with project management and a dashboard.", "task-management"],
    ["Build a booking calendar for customer appointments.", "booking"],
    ["Create an online store with a shopping cart and checkout.", "commerce"],
    ["Build a weather dashboard.", "general"]
  ])("classifies goals without client-provided steps", (goal, expected) => {
    const proposal = proposeApplicationPlan(goal);
    expect(proposal.category).toBe(expected);
    expect(proposal.requiresHumanReview).toBe(true);
    expect(proposal.steps).toHaveLength(8);
    expect(proposal.steps[0].dependsOn).toEqual([]);
    expect(proposal.steps[1].dependsOn).toEqual(["step-1"]);
    expect(proposal.steps.at(-1).task).toMatch(/review and approve/i);
    if (expected === "task-management") {
      expect(proposal.steps.some(step => /task lifecycle/i.test(step.task))).toBe(true);
    }
  });
});
