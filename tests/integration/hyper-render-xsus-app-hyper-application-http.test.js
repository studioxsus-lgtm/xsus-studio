import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationHttpHandler } from "../../src/platform/xsus-app/xsus-hyper-application-http.js";
import { createHyperApplicationDispatcher } from "../../src/platform/xsus-app/xsus-hyper-application-dispatcher.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const authorization = "Bearer test_access_token_1234567890";
const body = JSON.stringify({ operation: "application.plan", projectId, prompt: "Build a dashboard" });

function setup({ owner = A, allowed = true, verifiedUser = A } = {}) {
  const planApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.plan",
    projectId, requestId: "plan_1", status: "accepted", secret: "never-return"
  }));
  const buildApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.build",
    projectId, requestId: "build_1", status: "completed"
  }));
  const dispatcher = createHyperApplicationDispatcher({
    verifyAccessToken: async () => ({ id: verifiedUser }),
    getProjectOwner: async () => owner,
    authorizeOperation: async () => allowed,
    planApplication, buildApplication
  });
  const handle = createHyperApplicationHttpHandler({ dispatcher });
  return { handle, planApplication, buildApplication };
}

describe("Hyper application HTTP boundary — reference only, no Render deployment", () => {
  it("returns a sanitized plan response after successful authorization", async () => {
    const ctx = setup();
    const response = await ctx.handle({
      method: "POST", headers: { authorization }, body
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true, contractVersion: "1.0.0", operation: "application.plan",
      projectId, requestId: "plan_1", status: "accepted"
    });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(JSON.stringify(response)).not.toContain("secret");
    expect(ctx.planApplication).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["wrong method", { method: "GET", headers: { authorization }, body }, 405],
    ["missing auth", { method: "POST", headers: {}, body }, 401],
    ["invalid JSON", { method: "POST", headers: { authorization }, body: "{" }, 400],
    ["non-object JSON", { method: "POST", headers: { authorization }, body: "[]" }, 400],
    ["oversized body", { method: "POST", headers: { authorization }, body: "x".repeat(32769) }, 400],
    ["invalid project", { method: "POST", headers: { authorization },
      body: JSON.stringify({ operation: "application.plan", projectId: "invalid", prompt: "Hi" }) }, 400]
  ])("rejects %s before execution", async (_, input, status) => {
    const ctx = setup();
    const response = await ctx.handle(input);
    expect(response.status).toBe(status);
    expect(ctx.planApplication).not.toHaveBeenCalled();
    expect(ctx.buildApplication).not.toHaveBeenCalled();
  });

  it.each([
    ["A cannot access B project", { owner: B }, 403],
    ["B cannot access A project", { verifiedUser: B }, 403],
    ["unknown project", { owner: null }, 403],
    ["permission denied", { allowed: false }, 403]
  ])("denies %s without running the model", async (_, config, status) => {
    const ctx = setup(config);
    const response = await ctx.handle({ method: "POST", headers: { authorization }, body });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ ok: false, code: "ACCESS_DENIED" });
    expect(ctx.planApplication).not.toHaveBeenCalled();
    expect(ctx.buildApplication).not.toHaveBeenCalled();
  });

  it("does not expose internal executor failures", async () => {
    const ctx = setup();
    ctx.planApplication.mockRejectedValue(new Error("secret database password"));
    const response = await ctx.handle({ method: "POST", headers: { authorization }, body });
    expect(response).toMatchObject({
      status: 500, body: { ok: false, code: "HYPER_INTERNAL_ERROR" }
    });
    expect(JSON.stringify(response)).not.toContain("password");
  });

  it("requires an explicitly injected authorized dispatcher", () => {
    expect(() => createHyperApplicationHttpHandler()).toThrow("authorized Hyper dispatcher");
  });
});
