import { describe, it, expect, vi } from "vitest";
import { createPrivateChatRoundTrip } from "../../src/server/private-chat-round-trip.js";
const conversationId = "550e8400-e29b-41d4-a716-446655440001";
const operationId = "550e8400-e29b-41d4-a716-446655440002";
const args = { conversationId, operationId, query: "Hello" };
function setup() {
  const order = [];
  const saveUserMessage = vi.fn(async ({ conversationId, operationId, content }) => {
    order.push("user");
    return { conversationId, operationId, content };
  });
  const sendPrivateReply = vi.fn(async ({ conversationId, operationId }) => {
    order.push("assistant");
    return { conversationId, operationId, answer: "Hi", persisted: true };
  });
  return { order, saveUserMessage, sendPrivateReply,
    coordinator: createPrivateChatRoundTrip({ saveUserMessage, sendPrivateReply }) };
}
describe("Private chat round trip", () => {
  it("persists user before requesting assistant", async () => {
    const x = setup();
    expect((await x.coordinator.send(args)).answer).toBe("Hi");
    expect(x.order).toEqual(["user", "assistant"]);
  });
  it("deduplicates completed operations", async () => {
    const x = setup();
    await x.coordinator.send(args);
    await x.coordinator.send(args);
    expect(x.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(x.sendPrivateReply).toHaveBeenCalledTimes(1);
  });
  it("deduplicates concurrent operations", async () => {
    const x = setup();
    await Promise.all([x.coordinator.send(args), x.coordinator.send(args)]);
    expect(x.saveUserMessage).toHaveBeenCalledTimes(1);
    expect(x.sendPrivateReply).toHaveBeenCalledTimes(1);
  });
  it("never generates when user persistence fails", async () => {
    const x = setup();
    x.saveUserMessage.mockRejectedValueOnce(new Error("RLS denied"));
    await expect(x.coordinator.send(args)).rejects.toThrow("RLS denied");
    expect(x.sendPrivateReply).not.toHaveBeenCalled();
  });
  it("rejects mismatched user write", async () => {
    const x = setup();
    x.saveUserMessage.mockResolvedValueOnce({ conversationId, operationId, content: "Other" });
    await expect(x.coordinator.send(args)).rejects.toThrow("User message persistence verification failed.");
    expect(x.sendPrivateReply).not.toHaveBeenCalled();
  });
  it("blocks operation reuse with different query", async () => {
    const x = setup();
    await x.coordinator.send(args);
    await expect(x.coordinator.send({ ...args, query: "Different" })).rejects.toThrow("Operation ID reused");
  });
  it("invalidates pending account operations", async () => {
    const x = setup();
    let release;
    x.saveUserMessage.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = x.coordinator.send(args);
    x.coordinator.invalidate();
    release({ conversationId, operationId, content: args.query });
    await expect(pending).rejects.toThrow("Private chat session changed.");
    expect(x.sendPrivateReply).not.toHaveBeenCalled();
  });
  it("rejects unpersisted assistant reply", async () => {
    const x = setup();
    x.sendPrivateReply.mockResolvedValueOnce({ conversationId, operationId, answer: "Hi", persisted: false });
    await expect(x.coordinator.send(args)).rejects.toThrow("Assistant persistence verification failed.");
  });
});
