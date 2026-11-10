/**
 * XSUS AI V3 — private assistant persistence boundary.
 * Pure in-process integration checks: no network, keys or real database writes.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";

const userId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const body = { conversationId, operationId, query: "Test query" };
const authorization = "Bearer test-token";

function fixture({ failSecondCheck = false, writerFailure = false } = {}) {
  const verifyUser = vi.fn(async () => ({ userId, token: "test-token" }));
  const verifyConversation = vi.fn(async () => {
    if (failSecondCheck && verifyConversation.mock.calls.length === 2) {
      throw new Error("Ownership changed");
    }
  });
  const verifyUserMessage = vi.fn(async () => undefined);
  const generate = vi.fn(async () => ({ answer: "Test answer" }));
  const save = vi.fn(async () => {
    if (writerFailure) throw new Error("Persistence unavailable");
    return { id: "44444444-4444-4444-8444-444444444444", content: "Test answer" };
  });
  const handler = createPrivateChatHandler({
    authorize: { verifyUser, verifyConversation, verifyUserMessage },
    generate, writer: { save }
  });
  return { handler, verifyUser, verifyConversation, verifyUserMessage, generate, save };
}

describe("Private assistant persistence authorization boundary", () => {
  test("rejects unauthenticated requests without generating or writing", async () => {
    const f = fixture();
    const result = await f.handler({ authorization: "", body });
    expect(result.status).toBe(401);
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.save).not.toHaveBeenCalled();
  });

  test("verifies ownership and user operation both before generation and before privileged write", async () => {
    const f = fixture();
    const result = await f.handler({ authorization, body });
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ answer: "Test answer", conversationId, operationId, persisted: true });
    expect(f.verifyConversation).toHaveBeenCalledTimes(2);
    expect(f.verifyUserMessage).toHaveBeenCalledTimes(2);
    expect(f.save).toHaveBeenCalledWith({ userId, conversationId, operationId, answer: "Test answer" });
  });

  test("never writes if ownership verification fails after generation", async () => {
    const f = fixture({ failSecondCheck: true });
    const result = await f.handler({ authorization, body });
    expect(result.status).toBe(503);
    expect(f.generate).toHaveBeenCalledOnce();
    expect(f.save).not.toHaveBeenCalled();
  });

  test("fails closed and never returns an unpersisted answer if writer fails", async () => {
    const f = fixture({ writerFailure: true });
    const result = await f.handler({ authorization, body });
    expect(result.status).toBe(503);
    expect(result.data).not.toHaveProperty("answer");
    expect(f.save).toHaveBeenCalledOnce();
  });

  test("returns 501 without a writer and does not generate", async () => {
    const generate = vi.fn(async () => ({ answer: "Test answer" }));
    const handler = createPrivateChatHandler({
      authorize: {
        verifyUser: async () => ({ userId, token: "test-token" }),
        verifyConversation: async () => undefined,
        verifyUserMessage: async () => undefined,
      },
      generate,
    });
    const result = await handler({ authorization, body });
    expect(result.status).toBe(501);
    expect(generate).not.toHaveBeenCalled();
  });
});
