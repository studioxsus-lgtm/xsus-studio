import { describe, it, expect, vi } from "vitest";
import { createHyperAuthenticatedEvidenceService } from "./hyper-owned-evidence-authenticated-service.js";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const input = {
  observationId: "obs-1", serviceId: "xsus-app",
  snapshot: {
    instanceId: "instance-1234", processId: 42,
    startedAt: "2026-11-15T00:00:00.000Z",
    observedAt: "2026-11-15T00:00:01.000Z",
    source: "local-process-observation"
  }
};
const make = (fetchImpl, enabled = true) => createHyperAuthenticatedEvidenceService({
  url: "https://example.supabase.co",
  publishableKey: "test-publishable-key",
  serviceRoleKey: "test-service-role",
  key: Buffer.alloc(32, 7), keyId: "key-v1", fetchImpl, enabled
});
const token = "a".repeat(32);

describe("Hyper authenticated owned evidence internal integration", () => {
  it("is disabled without network access by default", async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl, false).create({ accessToken: token, input }))
      .toEqual({ stored: false, reason: "SERVICE_DISABLED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated users before evidence RPC", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false }));
    const result = await make(fetchImpl).create({ accessToken: token, input });
    expect(result.reason).toBe("UNAUTHENTICATED");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain("/auth/v1/user");
  });
  it("derives ownership from Supabase Auth, never client-supplied userId", async () => {
    const fetchImpl = vi.fn(async (url) => url.includes("/auth/v1/user")
      ? { ok: true, json: async () => ({ id: userId }) }
      : { ok: true, json: async () => "obs-1" });
    const result = await make(fetchImpl).create({
      accessToken: token,
      input: { ...input, userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
    });
    expect(result).toEqual({ stored: true, observationId: "obs-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [rpcUrl, rpcOptions] = fetchImpl.mock.calls[1];
    expect(rpcUrl).toContain("/rpc/hyper_insert_owned_evidence");
    const payload = JSON.parse(rpcOptions.body);
    expect(payload.p_user_id).toBe(userId);
    expect(payload.p_bundle).not.toHaveProperty("userId");
    expect(payload.p_bundle.authentication_tag).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects invalid Supabase user IDs without attempting evidence write", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true, json: async () => ({ id: "not-a-uuid" })
    }));
    const result = await make(fetchImpl).create({ accessToken: token, input });
    expect(result.reason).toBe("UNAUTHENTICATED");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("fails closed if the atomic RPC fails after valid authentication", async () => {
    const fetchImpl = vi.fn(async (url) => url.includes("/auth/v1/user")
      ? { ok: true, json: async () => ({ id: userId }) }
      : { ok: false });
    const result = await make(fetchImpl).create({ accessToken: token, input });
    expect(result.reason).toBe("ATOMIC_PROVISIONING_FAILED");
  });
});
