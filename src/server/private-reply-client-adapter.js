/**
 * XSUS AI V3 — Authenticated private reply transport.
 * Opt-in adapter; no UI activation and no browser-side assistant writes.
 * A previously persisted user message is required by the server.
 */
export function createPrivateReplyTransport({
  supabase, endpoint, fetchImpl = globalThis.fetch
} = {}) {
  if (!supabase?.auth?.getSession || typeof fetchImpl !== "function" ||
      typeof endpoint !== "string" || !/^https:\/\//.test(endpoint)) {
    throw new TypeError("Authenticated private reply dependencies are required.");
  }
  return async function sendPrivateReply({ conversationId, operationId, query } = {}) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(conversationId ?? "") || !uuid.test(operationId ?? "") ||
        typeof query !== "string" || !query.trim() || query.length > 8000) {
      throw new TypeError("Invalid private reply request.");
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token || !data.session.user?.id) {
      throw new Error("Authentication required.");
    }
    const userId = data.session.user.id;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`
      },
      body: JSON.stringify({ conversationId, operationId, query })
    });
    if (!response.ok) throw new Error("Private reply could not be saved.");
    const result = await response.json();
    if (result?.persisted !== true || result.conversationId !== conversationId ||
        result.operationId !== operationId || typeof result.answer !== "string" ||
        !result.answer.trim()) {
      throw new Error("Invalid persisted private reply.");
    }
    // A session switch during the network request must never display old-account data.
    const latest = await supabase.auth.getSession();
    if (latest.error || latest.data?.session?.user?.id !== userId ||
        latest.data?.session?.access_token !== data.session.access_token) {
      throw new Error("Private reply session changed.");
    }
    return { answer: result.answer, persisted: true, conversationId, operationId };
  };
}
