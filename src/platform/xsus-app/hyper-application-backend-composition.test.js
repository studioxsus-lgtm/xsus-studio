import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationBackendComposition } from "./hyper-application-backend-composition.js";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const project = "33333333-3333-4333-8333-333333333333";
const token = "test_access_token_123456789012345";
const makeRequest = (operation = "application.plan") => ({
  method: "POST",
  headers: { authorization: "Bearer " + token },
  body: JSON.stringify({ operation, projectId: project, prompt: "Build a secure app" })
});
const create = (overrides = {}) => {
  const planApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.plan",
    projectId: project, requestId: "req_1", status: "accepted", privateToken: "never-expose"
  }));
  const buildApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.build",
    projectId: project, requestId: "req_2", status: "accepted"
  }));
  const fetchImpl = vi.fn(async (url) => ({
    ok: true,
    json: async () => url.includes("/auth/v1/user")
      ? { id: userA }
      : [{ id: project, owner_id: userA }]
  }));
  const authorizeOperation = vi.fn(async () => true);
  const composition = createHyperApplicationBackendComposition({
    supabaseUrl: "https://xsus-example.supabase.co",
    publishableKey: "publishable-key",
    serviceRoleKey: "service-role-key",
    fetchImpl, authorizeOperation, planApplication, buildApplication,
    enabled: true, ...overrides
  });
  return { composition, planApplication, buildApplication, fetchImpl, authorizeOperation };
};

describe("Hyper application backend — verified identity and project isolation", () => {
  it("remains disabled by default without accessing Supabase or executors", async () => {
    const fetchImpl = vi.fn();
    const planApplication = vi.fn();
    const { composition } = create({ enabled: false, fetchImpl, planApplication });
    const result = await composition.handle(makeRequest());
    expect(result.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(planApplication).not.toHaveBeenCalled();
  });

  it("authorizes verified owner and strips private fields", async () => {
    const { composition, planApplication } = create();
    const result = await composition.handle(makeRequest());
    expect(result.status).toBe(200);
    expect(result.body.requestId).toBe("req_1");
    expect(JSON.stringify(result)).not.toContain("never-expose");
    expect(planApplication).toHaveBeenCalledTimes(1);
    expect(planApplication.mock.calls[0][0]).not.toHaveProperty("token");
  });

  it("authorizes build through independent executor", async () => {
    const { composition, buildApplication, planApplication } = create();
    expect((await composition.handle(makeRequest("application.build"))).status).toBe(200);
    expect(buildApplication).toHaveBeenCalledTimes(1);
    expect(planApplication).not.toHaveBeenCalled();
  });

  it("denies cross-user project access before execution", async () => {
    const { composition, planApplication, buildApplication } = create({
      fetchImpl: async url => ({
        ok: true,
        json: async () => url.includes("/auth/v1/user")
          ? { id: userB } : [{ id: project, owner_id: userA }]
      })
    });
    expect((await composition.handle(makeRequest())).status).toBe(403);
    expect(planApplication).not.toHaveBeenCalled();
    expect(buildApplication).not.toHaveBeenCalled();
  });

  it("denies invalid token and permission rejection", async () => {
    const deniedAuth = create({
      fetchImpl: async () => ({ ok: false, json: async () => ({}) })
    });
    expect((await deniedAuth.composition.handle(makeRequest())).status).toBe(401);
    expect(deniedAuth.planApplication).not.toHaveBeenCalled();
    const deniedPermission = create({ authorizeOperation: async () => false });
    expect((await deniedPermission.composition.handle(makeRequest())).status).toBe(403);
    expect(deniedPermission.planApplication).not.toHaveBeenCalled();
  });

  it("fails closed if ownership database is unavailable", async () => {
    const { composition, planApplication } = create({
      fetchImpl: async url => ({
        ok: url.includes("/auth/v1/user"),
        json: async () => ({ id: userA })
      })
    });
    expect((await composition.handle(makeRequest())).status).toBe(403);
    expect(planApplication).not.toHaveBeenCalled();
  });

  it("requires explicit trusted executors", () => {
    expect(() => createHyperApplicationBackendComposition({
      supabaseUrl: "https://xsus-example.supabase.co",
      publishableKey: "key", serviceRoleKey: "key"
    })).toThrow(TypeError);
  });
});
