import { describe, it, expect, vi } from "vitest";
import { createHyperApplicationClient } from "../../platform/xsus-app/xsus-hyper-application-client.js";
const projectId = "33333333-3333-4333-8333-333333333333";
const token = "test_access_token_123456789012345";
const request = { operation: "application.plan", projectId, prompt: "Create an app" };
const setup = (overrides = {}) => {
  const getAccessToken = vi.fn(async () => token);
  const fetchImpl = vi.fn(async () => ({
    status: 200,
    json: async () => ({
      ok: true, contractVersion: "1.0.0",
      operation: request.operation, projectId,
      requestId: "req_1", status: "accepted", secret: "should-not-leak"
    })
  }));
  return { getAccessToken, fetchImpl, client: createHyperApplicationClient({
    getAccessToken, fetchImpl, ...overrides
  }) };
};
describe("XSUS App Hyper plan/build browser transport", () => {
  it("does not request token or contact server when disabled", async () => {
    const { client, getAccessToken, fetchImpl } = setup();
    expect(await client.execute(request)).toEqual({
      ok: false, code: "HYPER_APPLICATION_DISABLED"
    });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("sends validated request with bearer token and sanitized response", async () => {
    const { client, fetchImpl } = setup({ enabled: true });
    const result = await client.execute(request);
    expect(result.ok).toBe(true);
    expect(result.requestId).toBe("req_1");
    expect(JSON.stringify(result)).not.toContain("should-not-leak");
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/xsus-app/hyper/application");
    expect(options.headers.Authorization).toBe("Bearer " + token);
    expect(JSON.parse(options.body)).toMatchObject(request);
    expect(options.credentials).toBe("omit");
  });
  it("refuses invalid input before token lookup", async () => {
    const { client, getAccessToken, fetchImpl } = setup({ enabled: true });
    expect((await client.execute({ ...request, projectId: "bad" })).code).toBe("INVALID_REQUEST");
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([[401,"UNAUTHENTICATED"],[403,"ACCESS_DENIED"],[503,"HYPER_APPLICATION_UNAVAILABLE"],[500,"HYPER_APPLICATION_FAILED"]])(
    "maps status %s to %s", async (status, code) => {
      const { client } = setup({
        enabled: true, fetchImpl: async () => ({ status })
      });
      expect((await client.execute(request)).code).toBe(code);
    }
  );
  it("fails closed on invalid token and untrusted server response", async () => {
    const { client, fetchImpl } = setup({ enabled: true, getAccessToken: async () => "bad" });
    expect((await client.execute(request)).code).toBe("UNAUTHENTICATED");
    expect(fetchImpl).not.toHaveBeenCalled();
    const bad = setup({ enabled: true, fetchImpl: async () => ({
      status: 200, json: async () => ({ ok: true, operation: "application.build" })
    }) });
    expect((await bad.client.execute(request)).code).toBe("NETWORK_OR_RESPONSE_ERROR");
  });
  it("rejects cross-origin endpoint overrides", () => {
    expect(() => setup({ endpoint: "https://attacker.example/collect" })).toThrow(TypeError);
  });
});
