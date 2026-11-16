import { describe, expect, it, vi } from "vitest";
import { createHyperApplicationAuthorizationGate } from "../../platform/xsus-app/xsus-hyper-application-authorization.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const authorization = "Bearer test_access_token_1234567890";
const body = { operation: "application.plan", projectId, prompt: "Build an app" };

function setup({ userId = A, ownerId = A, permitted = true } = {}) {
  const verifyAccessToken = vi.fn(async () => ({ id: userId }));
  const getProjectOwner = vi.fn(async () => ownerId);
  const authorizeOperation = vi.fn(async () => permitted);
  const gate = createHyperApplicationAuthorizationGate({
    verifyAccessToken, getProjectOwner, authorizeOperation
  });
  return { gate, verifyAccessToken, getProjectOwner, authorizeOperation };
}

describe("Hyper application authorization — server reference gate", () => {
  it.each(["application.plan", "application.build"])(
    "authorizes %s only with verified identity, ownership and permission",
    async operation => {
      const ctx = setup();
      const result = await ctx.gate.authorize({
        authorization, body: { ...body, operation }
      });
      expect(result.userId).toBe(A);
      expect(result.request).toMatchObject({ operation, projectId });
      expect(Object.isFrozen(result)).toBe(true);
      expect(ctx.verifyAccessToken).toHaveBeenCalledWith("test_access_token_1234567890");
      expect(ctx.getProjectOwner).toHaveBeenCalledWith(projectId, A);
      expect(ctx.authorizeOperation).toHaveBeenCalledWith({ userId: A, projectId, operation });
      expect(JSON.stringify(result)).not.toContain("test_access_token");
    }
  );

  it.each([undefined, "", "Bearer ", "Basic abc", "Bearer short", "bearer test_access_token_1234567890"])(
    "rejects invalid authorization header %j before invoking dependencies", async header => {
      const ctx = setup();
      await expect(ctx.gate.authorize({ authorization: header, body }))
        .rejects.toThrow("Unauthorized");
      expect(ctx.verifyAccessToken).not.toHaveBeenCalled();
      expect(ctx.getProjectOwner).not.toHaveBeenCalled();
      expect(ctx.authorizeOperation).not.toHaveBeenCalled();
    }
  );

  it("rejects an invalid request before token verification", async () => {
    const ctx = setup();
    await expect(ctx.gate.authorize({
      authorization, body: { ...body, projectId: "bad" }
    })).rejects.toThrow("Valid project ID");
    expect(ctx.verifyAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    ["A token accessing B project", A, B],
    ["B token accessing A project", B, A],
    ["unknown project", A, null]
  ])("denies %s without operation authorization", async (_, userId, ownerId) => {
    const ctx = setup({ userId, ownerId });
    await expect(ctx.gate.authorize({ authorization, body }))
      .rejects.toThrow("Hyper project access denied.");
    expect(ctx.authorizeOperation).not.toHaveBeenCalled();
  });

  it("denies when operation permission is not explicitly true", async () => {
    const ctx = setup({ permitted: "true" });
    await expect(ctx.gate.authorize({ authorization, body }))
      .rejects.toThrow("Hyper operation access denied.");
  });

  it("fails closed on token verification errors", async () => {
    const ctx = setup();
    ctx.verifyAccessToken.mockRejectedValue(new Error("private JWT error"));
    await expect(ctx.gate.authorize({ authorization, body }))
      .rejects.toThrow("Unauthorized Hyper application request.");
    expect(ctx.getProjectOwner).not.toHaveBeenCalled();
  });

  it("fails closed on ownership lookup errors without leaking database details", async () => {
    const ctx = setup();
    ctx.getProjectOwner.mockRejectedValue(new Error("secret database table"));
    await expect(ctx.gate.authorize({ authorization, body }))
      .rejects.toThrow("Hyper project access denied.");
    expect(ctx.authorizeOperation).not.toHaveBeenCalled();
  });

  it("fails closed on operation authorization errors", async () => {
    const ctx = setup();
    ctx.authorizeOperation.mockRejectedValue(new Error("secret permissions table"));
    await expect(ctx.gate.authorize({ authorization, body }))
      .rejects.toThrow("Hyper operation access denied.");
  });

  it("ignores client-supplied owner identity and permissions", async () => {
    const ctx = setup({ userId: A, ownerId: B });
    await expect(ctx.gate.authorize({
      authorization,
      body: { ...body, userId: B, ownerId: A, permitted: true }
    })).rejects.toThrow("Hyper project access denied.");
    expect(ctx.authorizeOperation).not.toHaveBeenCalled();
  });

  it("requires trusted dependencies and cannot silently enable a backend", () => {
    expect(() => createHyperApplicationAuthorizationGate()).toThrow("Trusted server");
    expect(() => createHyperApplicationAuthorizationGate({
      verifyAccessToken: async () => ({ id: A })
    })).toThrow("Trusted server");
  });
});
