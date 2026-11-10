import { describe, it, expect, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "550e8400-e29b-41d4-a716-446655440001";
const body = { conversationId: A, operationId: B, query: "Hello" };
function make({ rejectUser = false, rejectConversation = false } = {}) {
  const authorize = {
    verifyUser: vi.fn().mockImplementation(async () => {
      if (rejectUser) throw new Error("bad token");
      return { userId: A, token: "token" };
    }),
    verifyUserMessage: vi.fn().mockResolvedValue(true),
    verifyConversation: vi.fn().mockImplementation(async () => {
      if (rejectConversation) throw new Error("not owner");
      return true;
    })
  };
  return { handler: createPrivateChatHandler({ authorize }), authorize };
}
describe("Private chat HTTP handler (disabled persistence)", () => {
  it("rejects malformed input", async () => {
    expect((await make().handler({ authorization: "Bearer token", body: {} })).status).toBe(400);
  });
  it("requires authorization", async () => {
    expect((await make().handler({ body })).status).toBe(401);
  });
  it("rejects invalid token", async () => {
    expect((await make({ rejectUser: true }).handler({ authorization: "Bearer token", body })).status).toBe(403);
  });
  it("rejects conversation owned by another user", async () => {
    expect((await make({ rejectConversation: true }).handler({ authorization: "Bearer token", body })).status).toBe(403);
  });
  it("returns 501 until a secure persistence writer is installed", async () => {
    const { handler, authorize } = make();
    const result = await handler({ authorization: "Bearer token", body });
    expect(result.status).toBe(501);
    expect(authorize.verifyConversation).toHaveBeenCalledOnce();
  });
});
