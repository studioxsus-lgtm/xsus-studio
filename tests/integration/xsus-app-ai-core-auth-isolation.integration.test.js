import { describe, it, expect, vi } from "vitest";
import { createXsusAppAiCoreAdapter } from "../../platform/xsus-app/xsus-ai-core-client.js";
const id = "22222222-2222-4222-8222-222222222222";
const user = "user-A";
function setup() {
  let currentUser = user;
  const supabase = { auth: {
    getUser: vi.fn(async () => ({ data: { user: currentUser ? { id: currentUser } : null }, error: null })),
    getSession: vi.fn(async () => ({ data: { session: {
      user: { id: user }, access_token: "private_test_jwt"
    } }, error: null }))
  } };
  const fetchImpl = vi.fn(async () => ({
    ok: true, json: async () => ({ answer: "XSUS AI response" })
  }));
  const adapter = createXsusAppAiCoreAdapter({ supabase, fetchImpl, getLanguage: () => "sq" });
  return { supabase, fetchImpl, adapter, changeUser: value => { currentUser = value; } };
}
describe("XSUS App authenticated AI Core boundary", () => {
  it("sends a bearer token and no privileged keys", async () => {
    const { adapter, fetchImpl } = setup();
    await expect(adapter({ message: "  Përshëndetje  ", conversationId: id }))
      .resolves.toMatchObject({ answer: "XSUS AI response" });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://xsus-studio.onrender.com/api/chat");
    expect(options.headers.Authorization).toBe("Bearer private_test_jwt");
    expect(JSON.parse(options.body)).toEqual({
      query: "Përshëndetje", language: "sq", conversationId: id
    });
    expect(options.credentials).toBe("omit");
    expect(options.redirect).toBe("error");
    expect(JSON.stringify(options)).not.toMatch(/service.role|service_role|hmacSecret/i);
  });
  it("refuses anonymous access before the network request", async () => {
    const ctx = setup(); ctx.changeUser(null);
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("Authentication required.");
    expect(ctx.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects mismatched session identity before network access", async () => {
    const ctx = setup(); ctx.changeUser("user-B");
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("Authentication session mismatch.");
    expect(ctx.fetchImpl).not.toHaveBeenCalled();
  });
  it("does not release a response after account A switches to B", async () => {
    const ctx = setup();
    ctx.fetchImpl.mockImplementationOnce(async () => {
      ctx.changeUser("user-B");
      return { ok: true, json: async () => ({ answer: "private A response" }) };
    });
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("Account changed during AI request.");
  });
  it.each([
    [{ message: "", conversationId: id }, "Message cannot be empty."],
    [{ message: "Hello", conversationId: "bad" }, "Valid conversation ID is required."],
    [{ message: "Hello", conversationId: id, attachments: [{}] }, "Attachments are not supported."]
  ])("rejects invalid request without fetching", async (input, message) => {
    const ctx = setup();
    await expect(ctx.adapter(input)).rejects.toThrow(message);
    expect(ctx.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects backend failure without releasing a response", async () => {
    const ctx = setup();
    ctx.fetchImpl.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("XSUS AI Core request failed.");
  });
  it("refuses unapproved endpoints", () => {
    const ctx = setup();
    expect(() => createXsusAppAiCoreAdapter({
      supabase: ctx.supabase, fetchImpl: ctx.fetchImpl, endpoint: "https://example.com/api/chat"
    })).toThrow("Unapproved XSUS AI Core endpoint.");
  });
  it("rejects a response when the same account rotates its access token mid-request", async () => {
    const ctx = setup();
    ctx.fetchImpl.mockImplementationOnce(async () => {
      ctx.supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: user }, access_token: "rotated_test_jwt" } },
        error: null
      });
      return { ok: true, json: async () => ({ answer: "stale token reply" }) };
    });
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("Authentication session changed during AI request.");
  });
  it("rejects a response when the session disappears after the request", async () => {
    const ctx = setup();
    ctx.fetchImpl.mockImplementationOnce(async () => {
      ctx.supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
      return { ok: true, json: async () => ({ answer: "stale session reply" }) };
    });
    await expect(ctx.adapter({ message: "Hello", conversationId: id }))
      .rejects.toThrow("Authentication session changed during AI request.");
  });

});
