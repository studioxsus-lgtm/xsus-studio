import { describe, expect, it, vi } from "vitest";
import { createXSUSCoreAdapter } from "../../assets/js/xsus-ai/adapters/xsus-ai-core-adapter.js";

// XSUS App integration boundary: mocked transport, no live service calls.
// The independent AI Core stays behind its HTTP adapter.
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

describe("XSUS App → XSUS AI Core adapter boundary", () => {
  it("sends the documented chat request and returns only normalized output", async () => {
    const fetchMock = vi.fn(async () => makeResponse(200, {
      answer: "Generated guidance", source: "xsus-core", confidence: 0.9,
      metadata: { engine: "ai-core" }, requestId: "req-1"
    }));
    const adapter = createXSUSCoreAdapter({
      endpoint: "https://xsus-studio.onrender.com/api/chat",
      getLanguage: () => "en"
    });
    const previous = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await expect(adapter({ message: "  Build a task manager  ", conversationId: CONVERSATION_ID }))
        .resolves.toEqual({
          answer: "Generated guidance", source: "xsus-core", confidence: 0.9,
          metadata: { engine: "ai-core" }, requestId: "req-1"
        });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://xsus-studio.onrender.com/api/chat");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        query: "Build a task manager", language: "en", conversationId: CONVERSATION_ID
      });
      expect(options.headers).toEqual({ "Content-Type": "application/json" });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    } finally {
      globalThis.fetch = previous;
    }
  });

  it.each([
    [{ message: "", conversationId: CONVERSATION_ID }, "Message cannot be empty."],
    [{ message: "Hello", conversationId: "" }, "Conversation ID is required."],
    [{ message: "Hello", conversationId: CONVERSATION_ID, attachments: [{ name: "a.txt" }] },
      "File attachments are not yet supported"]
  ])("rejects unsupported requests before network access", async (request, error) => {
    const fetchMock = vi.fn();
    const previous = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await expect(createXSUSCoreAdapter()(request)).rejects.toThrow(error);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previous;
    }
  });

  it("rejects unsupported languages without a network request", async () => {
    const fetchMock = vi.fn();
    const previous = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await expect(createXSUSCoreAdapter({ getLanguage: () => "xx" })({
        message: "Hello", conversationId: CONVERSATION_ID
      })).rejects.toThrow("Unsupported language.");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previous;
    }
  });

  it.each([
    [503, { error: "unavailable" }, "XSUS AI Core HTTP error: 503"],
    [200, { answer: null }, "Invalid response from XSUS AI Core."],
    [200, { answer: "Ignored", error: "Core rejected request" }, "Core rejected request"]
  ])("fails closed for backend response %s", async (status, body, error) => {
    const previous = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => makeResponse(status, body));
    try {
      await expect(createXSUSCoreAdapter()({
        message: "Hello", conversationId: CONVERSATION_ID
      })).rejects.toThrow(error);
    } finally {
      globalThis.fetch = previous;
    }
  });
});
