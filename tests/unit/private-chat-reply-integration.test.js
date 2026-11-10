import { describe, it, expect, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
const USER = "550e8400-e29b-41d4-a716-446655440000";
const CONV = "550e8400-e29b-41d4-a716-446655440001";
const OP = "550e8400-e29b-41d4-a716-446655440002";
const body = { conversationId: CONV, operationId: OP, query: "Hello" };
function setup({ owner = true, answer = "AI answer", saved = true } = {}) {
  const authorize = {
    verifyUser: vi.fn().mockResolvedValue({ userId: USER, token: "token" }),
    verifyUserMessage: vi.fn().mockResolvedValue(true),
    verifyConversation: vi.fn().mockImplementation(async () => {
      if (!owner) throw new Error("Forbidden");
      return true;
    })
  };
  const generate = vi.fn().mockResolvedValue({ answer });
  const writer = { save: vi.fn().mockImplementation(async x => {
    if (!saved) throw new Error("DB failure");
    return { content: x.answer, id: OP };
  }) };
  const handler = createPrivateChatHandler({ authorize, generate, writer });
  return { handler, authorize, generate, writer };
}
describe("Authenticated private reply integration", () => {
  it("saves generated assistant reply after two ownership checks", async () => {
    const x = setup();
    const result = await x.handler({ authorization: "Bearer token", body });
    expect(result.status).toBe(200);
    expect(result.data.persisted).toBe(true);
    expect(x.authorize.verifyConversation).toHaveBeenCalledTimes(2);
    expect(x.authorize.verifyUserMessage).toHaveBeenCalledTimes(2);
    expect(x.writer.save).toHaveBeenCalledWith({ userId: USER, conversationId: CONV, operationId: OP, answer: "AI answer" });
    expect(x.generate).toHaveBeenCalledWith({ query: "Hello" });
  });
  it("never generates for unauthorized conversation", async () => {
    const x = setup({ owner: false });
    expect((await x.handler({ authorization: "Bearer token", body })).status).toBe(403);
    expect(x.generate).not.toHaveBeenCalled();
    expect(x.writer.save).not.toHaveBeenCalled();
  });
  it("rejects an absent or mismatched user message before generation", async () => {
    const x = setup();
    x.authorize.verifyUserMessage.mockRejectedValue(new Error("Missing user message"));
    expect((await x.handler({ authorization: "Bearer token", body })).status).toBe(403);
    expect(x.generate).not.toHaveBeenCalled();
    expect(x.writer.save).not.toHaveBeenCalled();
  });
  it("blocks privileged write when user message disappears during generation", async () => {
    const x = setup();
    x.authorize.verifyUserMessage.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("Removed"));
    expect((await x.handler({ authorization: "Bearer token", body })).status).toBe(503);
    expect(x.writer.save).not.toHaveBeenCalled();
  });
  it("never writes when generation fails", async () => {
    const x = setup({ answer: "" });
    expect((await x.handler({ authorization: "Bearer token", body })).status).toBe(422);
    expect(x.writer.save).not.toHaveBeenCalled();
  });
  it("does not claim success if database persistence fails", async () => {
    const x = setup({ saved: false });
    expect((await x.handler({ authorization: "Bearer token", body })).status).toBe(503);
  });
  it("does not activate without a writer", async () => {
    const x = setup();
    const handler = createPrivateChatHandler({ authorize: x.authorize, generate: x.generate });
    expect((await handler({ authorization: "Bearer token", body })).status).toBe(501);
  });
});
