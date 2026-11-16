import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationDispatcher } from "../../src/platform/xsus-app/xsus-hyper-application-dispatcher.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const authorization = "Bearer test_access_token_1234567890";

function setup({ owner = A, allowed = true, user = A } = {}) {
  const verifyAccessToken = vi.fn(async () => ({ id: user }));
  const getProjectOwner = vi.fn(async () => owner);
  const authorizeOperation = vi.fn(async () => allowed);
  const planApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.plan",
    projectId, requestId: "plan_1", status: "accepted", privateToken: "do-not-return"
  }));
  const buildApplication = vi.fn(async () => ({
    ok: true, contractVersion: "1.0.0", operation: "application.build",
    projectId, requestId: "build_1", status: "completed", privateToken: "do-not-return"
  }));
  const dispatcher = createHyperApplicationDispatcher({
    verifyAccessToken, getProjectOwner, authorizeOperation,
    planApplication, buildApplication
  });
  return { dispatcher, planApplication, buildApplication, verifyAccessToken,
    getProjectOwner, authorizeOperation };
}
const body = operation => ({ operation, projectId, prompt: "Build a dashboard" });

describe("Hyper application dispatcher — authorization-first reference", () => {
  it.each(["application.plan", "application.build"])(
    "executes %s only after verifying token, project and permission", async operation => {
      const ctx = setup();
      const result = await ctx.dispatcher.dispatch({ authorization, body: body(operation) });
      expect(result).toMatchObject({ operation, projectId, status: operation === "application.plan" ? "accepted" : "completed" });
      expect(result).not.toHaveProperty("privateToken");
      expect(ctx.planApplication).toHaveBeenCalledTimes(operation === "application.plan" ? 1 : 0);
      expect(ctx.buildApplication).toHaveBeenCalledTimes(operation === "application.build" ? 1 : 0);
      const executor = operation === "application.plan" ? ctx.planApplication : ctx.buildApplication;
      expect(executor).toHaveBeenCalledWith({
        userId: A, projectId, prompt: "Build a dashboard", contractVersion: "1.0.0"
      });
      expect(JSON.stringify(executor.mock.calls)).not.toContain("test_access_token");
    }
  );

  it.each([
    ["cross-account project", { owner: B }, authorization],
    ["operation denied", { allowed: false }, authorization],
    ["missing token", {}, undefined],
    ["unknown owner", { owner: null }, authorization]
  ])("never calls either executor when %s", async (_, config, header) => {
    const ctx = setup(config);
    await expect(ctx.dispatcher.dispatch({
      authorization: header, body: body("application.build")
    })).rejects.toThrow();
    expect(ctx.planApplication).not.toHaveBeenCalled();
    expect(ctx.buildApplication).not.toHaveBeenCalled();
  });

  it("rejects a response for a different project rather than returning it", async () => {
    const ctx = setup();
    ctx.planApplication.mockResolvedValue({
      ok: true, contractVersion: "1.0.0", operation: "application.plan",
      projectId: B, requestId: "bad_1", status: "completed"
    });
    await expect(ctx.dispatcher.dispatch({
      authorization, body: body("application.plan")
    })).rejects.toThrow("Invalid Hyper application response.");
  });

  it("does not fall back from a failing build executor to plan or XSUS AI Core", async () => {
    const ctx = setup();
    ctx.buildApplication.mockRejectedValue(new Error("Build unavailable"));
    await expect(ctx.dispatcher.dispatch({
      authorization, body: body("application.build")
    })).rejects.toThrow("Build unavailable");
    expect(ctx.planApplication).not.toHaveBeenCalled();
  });

  it("rejects missing explicit executors", () => {
    expect(() => createHyperApplicationDispatcher()).toThrow("Explicit Hyper application executors");
  });
});
