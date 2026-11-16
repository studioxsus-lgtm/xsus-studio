import { describe, expect, it, vi } from "vitest";
import { createGuardedHyperApplicationService } from "./hyper-guarded-application-service.js";
const readiness = Object.fromEntries([
  "authVerified", "projectSchemaVerified", "projectRlsVerified",
  "projectOwnershipVerified", "operationAuthorizationVerified",
  "planExecutorVerified", "buildExecutorVerified", "endToEndVerified"
].map(k => [k, true]));
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const make = (fetchImpl, authorizeOperation = async () => true) =>
  createGuardedHyperApplicationService({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-public-key",
    serviceRoleKey: "test-private-key",
    fetchImpl, authorizeOperation, readiness, enabled: true,
    createArtifactId: () => artifactId,
    createBuildRequestId: () => "build_1"
  });
const request = () => ({
  method: "POST", headers: { authorization: "Bearer test-token-123456789" },
  body: JSON.stringify({ operation: "application.build", projectId, prompt: "Task list" })
});
describe("Hyper authorized web build integration", () => {
  it("verifies identity and ownership before saving or reading build files", async () => {
    const saved = new Map();
    const fetchImpl = vi.fn(async (url, options) => {
      if (url.includes("/auth/v1/user")) return {
        ok: true, json: async () => ({ id: userId })
      };
      if (url.includes("/xsus_app_projects?")) return {
        ok: true, json: async () => [{ id: projectId, owner_id: userId }]
      };
      if (options.method === "POST") {
        saved.set(url.split("/").pop(), options.body);
        return { status: 201 };
      }
      if (options.method === "GET") return {
        status: 200,
        arrayBuffer: async () =>
          new TextEncoder().encode(saved.get(url.split("/").pop())).buffer
      };
      throw Error("Unexpected request");
    });
    const result = await make(fetchImpl).handle(request());
    expect(result.status).toBe(200);
    expect(result.body.artifactId).toBe(artifactId);
    expect(saved.size).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(8);
  });
  it("does not write for a project owned by another user", async () => {
    const fetchImpl = vi.fn(async url => url.includes("/auth/v1/user")
      ? { ok: true, json: async () => ({ id: userId }) }
      : { ok: true, json: async () => [{ id: projectId,
        owner_id: "22222222-2222-4222-8222-222222222222" }] });
    const result = await make(fetchImpl).handle(request());
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("does not write when operation authorization denies", async () => {
    const fetchImpl = vi.fn(async url => url.includes("/auth/v1/user")
      ? { ok: true, json: async () => ({ id: userId }) }
      : { ok: true, json: async () => [{ id: projectId, owner_id: userId }] });
    const result = await make(fetchImpl, async () => false).handle(request());
    expect(result.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
