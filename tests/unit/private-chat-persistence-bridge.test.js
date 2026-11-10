import { describe, it, expect, vi } from "vitest";
import { createPrivateChatPersistenceBridge } from "../../src/server/private-chat-persistence-bridge.js";
const conversationId = "550e8400-e29b-41d4-a716-446655440001";
const operationId = "550e8400-e29b-41d4-a716-446655440002";
const args = { conversationId, operationId, query: "Hello" };
function setup() {
  const order = [];
  const writeService = {
    save: vi.fn(async ({ conversationId, content }) => {
      order.push("user");
      return { id: operationId, conversationId, content, role: "user" };
    }),
    invalidate: vi.fn()
  };
  const supabase = { auth: { getSession: vi.fn(async () => ({
    data: { session: { access_token: "jwt", user: { id: "user-a" } } }, error: null
  })) } };
  const fetchImpl = vi.fn(async () => {
    order.push("assistant");
    return { ok: true, json: async () => ({
      persisted: true, answer: "Hi", conversationId, operationId
    }) };
  });
  const bridge = createPrivateChatPersistenceBridge({
    supabase, writeService, endpoint: "https://example.org/api/private-chat", fetchImpl
  });
  return { bridge, writeService, fetchImpl, order };
}
describe("Private chat persistence bridge", () => {
  it("uses normalized user write and sends assistant request after persistence", async () => {
    const x = setup();
    expect((await x.bridge.send(args)).answer).toBe("Hi");
    expect(x.order).toEqual(["user", "assistant"]);
    expect(x.writeService.save).toHaveBeenCalledWith({
      conversationId, operationId, content: "Hello"
    });
  });
  it("rejects invalid saved user role without assistant request", async () => {
    const x = setup();
    x.writeService.save.mockResolvedValueOnce({
      id: operationId, conversationId, content: "Hello", role: "assistant"
    });
    await expect(x.bridge.send(args)).rejects.toThrow("User message persistence verification failed.");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("never sends assistant request when user write fails", async () => {
    const x = setup();
    x.writeService.save.mockRejectedValueOnce(new Error("RLS denied"));
    await expect(x.bridge.send(args)).rejects.toThrow("RLS denied");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("invalidates both layers on logout", () => {
    const x = setup();
    x.bridge.invalidate();
    expect(x.writeService.invalidate).toHaveBeenCalledTimes(1);
  });
  it("deduplicates repeated round trips", async () => {
    const x = setup();
    await x.bridge.send(args);
    await x.bridge.send(args);
    expect(x.writeService.save).toHaveBeenCalledTimes(1);
    expect(x.fetchImpl).toHaveBeenCalledTimes(1);
  });
});
