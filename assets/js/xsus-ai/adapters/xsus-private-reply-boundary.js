/**
 * XSUS AI V3 — browser-only private reply boundary.
 * Opt-in: never activates private writes or changes the public chat endpoint.
 * AI Core remains an independent HTTP service; no backend module imports.
 */
export function createPrivateReplyBoundary({
  supabase, persistence, endpoint, fetchImpl = globalThis.fetch
} = {}) {
  if (typeof supabase?.auth?.getSession !== "function" ||
      typeof persistence?.saveWithReceipt !== "function" ||
      typeof persistence?.invalidate !== "function" ||
      typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) ||
      typeof fetchImpl !== "function") {
    throw new TypeError("Private reply boundary dependencies required.");
  }
  let generation = 0;
  const pending = new Set();
  function invalidate() {
    generation += 1;
    for (const controller of pending) controller.abort();
    pending.clear();
    persistence.invalidate();
  }
  async function session() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user?.id || !data.session.access_token) {
      throw new Error("Authentication required.");
    }
    return data.session;
  }
  async function send({ conversationId, messageId, message, attachments = [] } = {}) {
    if (attachments.length) throw new Error("Private chat attachments are not supported.");
    if (typeof message !== "string" || !message.trim() || message.length > 8000) {
      throw new TypeError("Invalid private chat message.");
    }
    const initial = await session();
    const token = generation;
    const receipt = await persistence.saveWithReceipt({
      localConversationId: conversationId, localMessageId: messageId, content: message
    });
    if (token !== generation) throw new Error("Private chat session changed.");
    if (!receipt || receipt.role !== "user" || receipt.content !== message ||
        typeof receipt.conversationId !== "string" ||
        typeof receipt.operationId !== "string") {
      throw new Error("Invalid persisted user receipt.");
    }
    const beforeReply = await session();
    if (beforeReply.user.id !== initial.user.id ||
        beforeReply.access_token !== initial.access_token) {
      invalidate();
      throw new Error("Private chat session changed.");
    }
    const controller = new AbortController();
    pending.add(controller);
    try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + beforeReply.access_token
      },
      body: JSON.stringify({
        conversationId: receipt.conversationId,
        operationId: receipt.operationId,
        query: message
      })
    });
    if (!response.ok) throw new Error("Private assistant reply was not persisted.");
    const result = await response.json();
    const latest = await session();
    if (token !== generation || latest.user.id !== initial.user.id ||
        latest.access_token !== initial.access_token) {
      invalidate();
      throw new Error("Private chat session changed.");
    }
    if (result?.persisted !== true ||
        result.conversationId !== receipt.conversationId ||
        result.operationId !== receipt.operationId ||
        typeof result.answer !== "string" || !result.answer.trim()) {
      throw new Error("Invalid persisted private reply.");
    }
    } finally {
      pending.delete(controller);
    }
    return { answer: result.answer, persisted: true };
  }
  return Object.freeze({ send, invalidate });
}
