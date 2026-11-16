import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationPlanExecutor } from "./hyper-application-plan-executor.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const input = { userId, projectId, prompt: "Create a scheduling web app", contractVersion: "1.0.0" };
describe("XSUS App Hyper authorized plan executor", () => {
  it("requires explicit durable draft persistence", () => {
    expect(() => createHyperApplicationPlanExecutor()).toThrow(TypeError);
  });
  it("creates and saves architecture draft without compilation", async () => {
    const saveDraft = vi.fn(async () => true);
    const execute = createHyperApplicationPlanExecutor({
      saveDraft, createRequestId: () => "plan_123"
    });
    const result = await execute(input);
    expect(result).toMatchObject({
      ok: true, operation: "application.plan", projectId,
      requestId: "plan_123", status: "completed"
    });
    const saved = saveDraft.mock.calls[0][0];
    expect(saved.userId).toBe(userId);
    expect(saved.projectId).toBe(projectId);
    expect(saved.draft.metadata.status).toBe("architecture-draft");
    expect(saved.draft.metadata.requiresValidation).toBe(true);
    expect(saved.draft.architecture.layers.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain(input.prompt);
  });
  it("does not claim success if persistence refuses or throws", async () => {
    for (const saveDraft of [async () => false, async () => { throw new Error("offline"); }]) {
      const execute = createHyperApplicationPlanExecutor({ saveDraft });
      await expect(execute(input)).rejects.toThrow();
    }
  });
  it("rejects invalid context before saving", async () => {
    const saveDraft = vi.fn(async () => true);
    const execute = createHyperApplicationPlanExecutor({ saveDraft });
    await expect(execute({ ...input, userId: "fake" })).rejects.toThrow(TypeError);
    await expect(execute({ ...input, prompt: "" })).rejects.toThrow(TypeError);
    await expect(execute({ ...input, contractVersion: "2.0.0" })).rejects.toThrow(TypeError);
    expect(saveDraft).not.toHaveBeenCalled();
  });
  it("rejects unsafe request IDs", async () => {
    const saveDraft = vi.fn(async () => true);
    const execute = createHyperApplicationPlanExecutor({
      saveDraft, createRequestId: () => "../../unsafe"
    });
    await expect(execute(input)).rejects.toThrow();
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
