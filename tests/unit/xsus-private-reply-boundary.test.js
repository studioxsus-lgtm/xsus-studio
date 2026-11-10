import { describe, it, expect, vi } from "vitest";
import { createPrivateReplyBoundary } from "../../assets/js/xsus-ai/adapters/xsus-private-reply-boundary.js";
const C = "33333333-3333-4333-8333-333333333333";
const O = "44444444-4444-4444-8444-444444444444";
const request = { conversationId: "local-a", messageId: "local-message", message: "Hello" };
function setup() {
  let user = "a";
  const supabase = { auth: { getSession: vi.fn(async () => ({
    data: { session: user ? { user: { id: user }, access_token: "jwt-" + user } : null },
    error: null
  })) } };
  const persistence = {
    saveWithReceipt: vi.fn(async () => ({
      conversationId: C, operationId: O, messageId: "saved", role: "user", content: "Hello"
    })),
    invalidate: vi.fn()
  };
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({
    persisted: true, conversationId: C, operationId: O, answer: "XSUS reply"
  }) }));
  const boundary = createPrivateReplyBoundary({
    supabase, persistence, endpoint: "https://example.org/api/private-chat", fetchImpl
  });
  return { boundary, persistence, fetchImpl, setUser: value => { user = value; } };
}
describe("Opt-in private reply boundary", () => {
  it("persists user first and sends verified operation ID with JWT", async () => {
    const x = setup();
    expect(await x.boundary.send(request)).toEqual({ answer: "XSUS reply", persisted: true });
    expect(x.persistence.saveWithReceipt).toHaveBeenCalledWith({
      localConversationId: "local-a", localMessageId: "local-message", content: "Hello"
    });
    expect(x.fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer jwt-a");
    expect(JSON.parse(x.fetchImpl.mock.calls[0][1].body)).toEqual({
      conversationId: C, operationId: O, query: "Hello"
    });
  });
  it("does not contact server when user write fails", async () => {
    const x = setup();
    x.persistence.saveWithReceipt.mockRejectedValueOnce(new Error("RLS denied"));
    await expect(x.boundary.send(request)).rejects.toThrow("RLS denied");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("requires authentication before any write", async () => {
    const x = setup(); x.setUser(null);
    await expect(x.boundary.send(request)).rejects.toThrow("Authentication required");
    expect(x.persistence.saveWithReceipt).not.toHaveBeenCalled();
  });
  it("blocks account switch after user persistence", async () => {
    const x = setup();
    x.persistence.saveWithReceipt.mockImplementationOnce(async () => {
      x.setUser("b");
      return { conversationId: C, operationId: O };
    });
    await expect(x.boundary.send(request)).rejects.toThrow("session changed");
    expect(x.fetchImpl).not.toHaveBeenCalled();
    expect(x.persistence.invalidate).toHaveBeenCalled();
  });
  it("blocks account switch during assistant request", async () => {
    const x = setup();
    x.fetchImpl.mockImplementationOnce(async () => {
      x.setUser("b");
      return { ok: true, json: async () => ({
        persisted: true, conversationId: C, operationId: O, answer: "Old secret"
      }) };
    });
    await expect(x.boundary.send(request)).rejects.toThrow("session changed");
  });
  it("fails closed when server does not confirm assistant persistence", async () => {
    const x = setup();
    x.fetchImpl.mockResolvedValueOnce({ ok: true, json: async () => ({
      persisted: false, conversationId: C, operationId: O, answer: "unsaved"
    }) });
    await expect(x.boundary.send(request)).rejects.toThrow("Invalid persisted");
  });
  it("rejects attachments without persisting user message", async () => {
    const x = setup();
    await expect(x.boundary.send({ ...request, attachments: [{ name: "file" }] }))
      .rejects.toThrow("attachments");
    expect(x.persistence.saveWithReceipt).not.toHaveBeenCalled();
  });
});
