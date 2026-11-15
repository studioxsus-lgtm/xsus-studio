import { describe, it, expect, vi } from "vitest";
import { createHyperNodeRuntimeRoute } from "./hyper-v8235-node-runtime-route.js";
import { createHyperAppBackendComposition } from "./hyper-v8234-backend-composition.js";

const userId = "550e8400-e29b-41d4-a716-446655440000";
const token = "a".repeat(32);
const body = JSON.stringify({ action: "evidence.verify", observationId: "obs_1" });
const authHeaders = { authorization: "Bearer " + token, "content-type": "application/json" };
function setup({ owned = false, authenticated = true, fetchImpl, authorizeEvidenceOwner } = {}) {
  const fetchMock = fetchImpl || vi.fn(async (url) => {
    if (url.endsWith("/auth/v1/user")) {
      return { ok: authenticated, json: async () => ({ id: userId }) };
    }
    throw Error("Unexpected storage access");
  });
  const owner = authorizeEvidenceOwner || vi.fn(async () => owned);
  const composition = createHyperAppBackendComposition({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-publishable",
    serviceRoleKey: "test-service-role",
    evidenceKey: "a".repeat(64),
    evidenceKeyId: "test-key",
    fetchImpl: fetchMock,
    authorizeEvidenceOwner: owner,
    enabled: true
  });
  return { route: createHyperNodeRuntimeRoute({ composition, enabled: true }), fetchMock, owner };
}
async function send(route, { headers = authHeaders, payload = body, method = "POST" } = {}) {
  const req = {
    method, headers,
    async *[Symbol.asyncIterator]() { yield Buffer.from(payload); }
  };
  const res = { writeHead: vi.fn(), end: vi.fn() };
  await route.handle(req, res);
  return {
    status: res.writeHead.mock.calls[0][0],
    headers: res.writeHead.mock.calls[0][1],
    body: JSON.parse(res.end.mock.calls[0][0])
  };
}
describe("Hyper v8.2.36 runtime security integration", () => {
  it("rejects missing bearer token before network access", async () => {
    const { route, fetchMock } = setup();
    const result = await send(route, { headers: { "content-type": "application/json" } });
    expect(result.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects invalid Supabase token before ownership check", async () => {
    const { route, owner, fetchMock } = setup({ authenticated: false });
    expect((await send(route)).status).toBe(401);
    expect(owner).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects forged userId from request body", async () => {
    const { route, owner } = setup();
    const payload = JSON.stringify({ action: "evidence.verify", observationId: "obs_1", userId: "attacker" });
    const result = await send(route, { payload });
    expect(result.status).toBe(403);
    expect(owner).toHaveBeenCalledWith({ userId, observationId: "obs_1" });
  });
  it("rejects evidence not owned by verified user before storage access", async () => {
    const { route, fetchMock } = setup({ owned: false });
    expect((await send(route)).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects client evidence.store even with valid identity", async () => {
    const { route, owner } = setup({ owned: true });
    const result = await send(route, { payload: JSON.stringify({ action: "evidence.store", observationId: "obs_1" }) });
    expect(result.status).toBe(400);
    expect(owner).not.toHaveBeenCalled();
  });
  it("fails closed on ownership provider exceptions", async () => {
    const { route } = setup({ authorizeEvidenceOwner: async () => { throw Error("secret"); } });
    const result = await send(route);
    expect(result.status).toBe(403);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("fails closed when evidence storage is unavailable", async () => {
    const { route } = setup({ owned: true });
    const result = await send(route);
    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);
  });
  it("does not cache authentication or evidence responses", async () => {
    const { route } = setup();
    const result = await send(route);
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(result.headers["X-Content-Type-Options"]).toBe("nosniff");
  });
  it("rejects oversized requests before Supabase authentication", async () => {
    const { route, fetchMock } = setup();
    const result = await send(route, { payload: "x".repeat(2049) });
    expect(result.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps AI Core independent of Hyper runtime", async () => {
    const { route } = setup();
    expect(route.path).toBe("/api/xsus-app/hyper/evidence/verify");
    expect(route.productionEligible).toBe(false);
    expect((await send(route, { method: "GET" })).status).toBe(405);
  });
});
