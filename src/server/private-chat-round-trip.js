/**
 * XSUS AI V3 — opt-in private message/reply coordinator.
 * A verified user write must complete before the privileged assistant request.
 * Caller supplies authenticated browser adapters; no direct AI Core dependency.
 */
export function createPrivateChatRoundTrip({ saveUserMessage, sendPrivateReply } = {}) {
  if (typeof saveUserMessage !== "function" || typeof sendPrivateReply !== "function") {
    throw new TypeError("Private user write and reply adapters are required.");
  }
  const inFlight = new Map();
  const completed = new Map();
  let epoch = 0;
  function invalidate() {
    epoch += 1;
    inFlight.clear();
    completed.clear();
  }
  async function send({ conversationId, operationId, query } = {}) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(conversationId ?? "") || !uuid.test(operationId ?? "") ||
        typeof query !== "string" || !query.trim() || query.length > 8000) {
      throw new TypeError("Invalid private chat round trip.");
    }
    const key = conversationId.toLowerCase() + ":" + operationId.toLowerCase();
    const existing = inFlight.get(key) || completed.get(key);
    if (existing) {
      if (existing.query !== query) throw new Error("Operation ID reused with different content.");
      return existing.promise;
    }
    const token = epoch;
    const promise = (async () => {
      const saved = await saveUserMessage({ conversationId, operationId, content: query });
      if (token !== epoch) throw new Error("Private chat session changed.");
      if (!saved || saved.conversationId !== conversationId ||
          saved.operationId !== operationId || saved.content !== query) {
        throw new Error("User message persistence verification failed.");
      }
      const reply = await sendPrivateReply({ conversationId, operationId, query });
      if (token !== epoch) throw new Error("Private chat session changed.");
      if (!reply || reply.persisted !== true || reply.conversationId !== conversationId ||
          reply.operationId !== operationId || typeof reply.answer !== "string" ||
          !reply.answer.trim()) {
        throw new Error("Assistant persistence verification failed.");
      }
      return reply;
    })();
    const entry = { query, promise };
    inFlight.set(key, entry);
    try {
      const result = await promise;
      if (token === epoch) completed.set(key, { query, promise: Promise.resolve(result) });
      return result;
    } finally {
      if (inFlight.get(key) === entry) inFlight.delete(key);
    }
  }
  return Object.freeze({ send, invalidate });
}
