import { describe, it, expect, vi } from "vitest";
import { createPrivateReplyTransport } from "../../src/server/private-reply-client-adapter.js";
const CONV = "550e8400-e29b-41d4-a716-446655440001";
const OP = "550e8400-e29b-41d4-a716-446655440002";
const session = { user: { id: "user-a" }, access_token: "jwt-a" };
function setup() {
  let current = session;
  const supabase = { auth: { getSession: vi.fn(async () => ({
    data: { session: current }, error: null
  })) } };
  const fetchImpl = vi.fn(async (_url, options) => ({
    ok: true, json: async () => ({
      answer: "Saved answer", persisted: true, conversationId: CONV, operationId: OP
    })
  }));
  const send = createPrivateReplyTransport({
    supabase, endpoint: "https://example.org/api/private-chat", fetchImpl
  });
  return { send, fetchImpl, setSession: next => { current = next; } };
}
describe("Authenticated private reply transport", () => {
  it("sends only validated operation and bearer token", async () => {
    const x = setup();
    expect((await x.send({ conversationId: CONV, operationId: OP, query: "Hello" })).answer).toBe("Saved answer");
    const [, options] = x.fetchImpl.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt-a");
    expect(JSON.parse(options.body)).toEqual({ conversationId: CONV, operationId: OP, query: "Hello" });
  });
  it("rejects missing session before network access", async () => {
    const x = setup(); x.setSession(null);
    await expect(x.send({ conversationId: CONV, operationId: OP, query: "Hello" })).rejects.toThrow("Authentication required.");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects invalid UUID before network access", async () => {
    const x = setup();
    await expect(x.send({ conversationId: "bad", operationId: OP, query: "Hello" })).rejects.toThrow("Invalid private reply request.");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects a session change while the request is pending", async () => {
    const x = setup();
    x.fetchImpl.mockImplementationOnce(async () => {
      x.setSession({ user: { id: "user-b" }, access_token: "jwt-b" });
      return { ok: true, json: async () => ({
        answer: "Old account", persisted: true, conversationId: CONV, operationId: OP
      }) };
    });
    await expect(x.send({ conversationId: CONV, operationId: OP, query: "Hello" })).rejects.toThrow("Private reply session changed.");
  });
  it("rejects unpersisted server responses", async () => {
    const x = setup();
    x.fetchImpl.mockResolvedValueOnce({ ok: true, json: async () => ({
      answer: "Not saved", persisted: false, conversationId: CONV, operationId: OP
    }) });
    await expect(x.send({ conversationId: CONV, operationId: OP, query: "Hello" })).rejects.toThrow("Invalid persisted private reply.");
  });
});
