/**
 * XSUS AI V3 — browser-to-private-backend opt-in boundary.
 * No real Supabase calls, production writes, or feature activation.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateReplyBoundary } from "../../assets/js/xsus-ai/adapters/xsus-private-reply-boundary.js";

const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const userId = "11111111-1111-4111-8111-111111111111";
const request = { conversationId: "local-1", messageId: "local-message-1", message: "Hello XSUS" };

function setup({ status = 200, persisted = true } = {}) {
  let currentUser = userId;
  const supabase = { auth: { getSession: vi.fn(async () => ({
    data: { session: currentUser ? { user: { id: currentUser }, access_token: "test-token" } : null },
    error: null
  })) } };
  const persistence = {
    saveWithReceipt: vi.fn(async () => ({
      conversationId, operationId, content: request.message, role: "user"
    })),
    invalidate: vi.fn()
  };
  const fetchImpl = vi.fn(async () => ({
    ok: status === 200, status,
    json: async () => ({ persisted, conversationId, operationId, answer: "Saved assistant reply" })
  }));
  return {
    boundary: createPrivateReplyBoundary({
      supabase, persistence, endpoint: "https://example.test/api/private-chat", fetchImpl
    }),
    persistence, fetchImpl, setUser: id => { currentUser = id; }
  };
}

describe("Private reply browser opt-in boundary (mocked)", () => {
  test("sends verified user receipt to backend and accepts only persisted assistant reply", async () => {
    const env = setup();
    await expect(env.boundary.send(request)).resolves.toEqual({
      answer: "Saved assistant reply", persisted: true
    });
    expect(env.persistence.saveWithReceipt).toHaveBeenCalledTimes(1);
    expect(env.fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = env.fetchImpl.mock.calls[0];
    expect(url).toBe("https://example.test/api/private-chat");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(options.body)).toEqual({
      conversationId, operationId, query: request.message
    });
  });

  test("refuses to claim success when backend private writes are disabled", async () => {
    const env = setup({ status: 503 });
    await expect(env.boundary.send(request)).rejects.toThrow(
      "Private assistant reply was not persisted."
    );
  });

  test("refuses backend success without a persisted receipt", async () => {
    const env = setup({ persisted: false });
    await expect(env.boundary.send(request)).rejects.toThrow(
      "Invalid persisted private reply."
    );
  });

  test("refuses requests after sign-out before a backend call", async () => {
    const env = setup();
    env.setUser(null);
    await expect(env.boundary.send(request)).rejects.toThrow("Authentication required.");
    expect(env.fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects attachments before any private database write", async () => {
    const env = setup();
    await expect(env.boundary.send({ ...request, attachments: [{ name: "file" }] }))
      .rejects.toThrow("Private chat attachments are not supported.");
    expect(env.persistence.saveWithReceipt).not.toHaveBeenCalled();
  });
});
