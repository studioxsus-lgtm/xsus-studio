import { describe, expect, it, vi } from "vitest";
import { createAuthorizedHyperArtifactReader } from "./hyper-authorized-artifact-reader.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const authorization = "Bearer valid-test-token-123456";
const input = { authorization, projectId, artifactId };
const make = (fetchImpl, authorizeRead = async () => true, enabled = true) =>
  createAuthorizedHyperArtifactReader({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-publishable", serviceRoleKey: "test-server-key",
    fetchImpl, authorizeRead, enabled
  });
const fetcher = (owner = userId) => vi.fn(async url => {
  if (url.includes("/auth/v1/user")) return {
    ok: true, json: async () => ({ id: userId })
  };
  if (url.includes("/xsus_app_projects?")) return {
    ok: true, json: async () => [{ id: projectId, owner_id: owner }]
  };
  return { status: 200, headers: { get: () => null },
    arrayBuffer: async () => new TextEncoder().encode("safe").buffer };
});
describe("XSUS App authorized artifact retrieval", () => {
  it("stays disabled by default and performs no fetch", async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl, async () => true, false).read(input)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("checks identity, owner and permission before private reads", async () => {
    const fetchImpl = fetcher();
    const authorizeRead = vi.fn(async () => true);
    const result = await make(fetchImpl, authorizeRead).read(input);
    expect(result.files).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(authorizeRead).toHaveBeenCalledWith({
      userId, projectId, artifactId, operation: "application.read"
    });
  });
  it("denies cross-owner reads before fetching files", async () => {
    const fetchImpl = fetcher("22222222-2222-4222-8222-222222222222");
    expect(await make(fetchImpl).read(input)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("denies missing permission before fetching files", async () => {
    const fetchImpl = fetcher();
    expect(await make(fetchImpl, async () => false).read(input)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid artifact identifiers without network calls", async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl).read({ ...input, artifactId: "../unsafe" }))
      .toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
