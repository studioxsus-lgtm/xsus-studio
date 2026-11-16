import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationPlanningService } from "./hyper-application-planning-service.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const id = "44444444-4444-4444-8444-444444444444";
const input = {
  userId, projectId, prompt: "Create a web dashboard", contractVersion: "1.0.0"
};
const setup = fetchImpl => createHyperApplicationPlanningService({
  supabaseUrl: "https://xsus-example.supabase.co",
  serviceRoleKey: "server-secret",
  fetchImpl, createRequestId: () => "plan_123"
});
describe("XSUS App Hyper planner -> Supabase draft persistence", () => {
  it("plans and confirms durable owner-scoped draft", async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 201,
      json: async () => [{
        id, owner_id: userId, project_id: projectId, request_id: "plan_123"
      }]
    }));
    const result = await setup(fetchImpl).planApplication(input);
    expect(result).toMatchObject({
      ok: true, status: "completed", operation: "application.plan",
      projectId, requestId: "plan_123"
    });
    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.architecture.metadata.status).toBe("architecture-draft");
    expect(body.architecture.metadata.requiresValidation).toBe(true);
    expect(body.owner_id).toBe(userId);
    expect(body.project_id).toBe(projectId);
    expect(result).not.toHaveProperty("artifactId");
  });
  it("fails closed on ownership mismatch or unavailable database", async () => {
    const mismatch = setup(async () => ({
      status: 201, json: async () => [{
        id, owner_id: "22222222-2222-4222-8222-222222222222",
        project_id: projectId, request_id: "plan_123"
      }]
    }));
    await expect(mismatch.planApplication(input)).rejects.toThrow("persistence failed");
    const offline = setup(async () => { throw new Error("offline"); });
    await expect(offline.planApplication(input)).rejects.toThrow("persistence failed");
  });
  it("never sends invalid caller identity to Supabase", async () => {
    const fetchImpl = vi.fn();
    await expect(setup(fetchImpl).planApplication({ ...input, userId: "invalid" }))
      .rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
