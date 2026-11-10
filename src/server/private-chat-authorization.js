/**
 * XSUS AI — server-only Supabase authentication and conversation ownership.
 * Uses the public anon/publishable key with the user's verified JWT.
 * Supabase RLS remains the authorization boundary; no service-role key.
 * No network requests occur until explicitly invoked by the server.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readBearerToken(header) {
  if (typeof header !== "string") throw new Error("Authentication required.");
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header);
  if (!match || match[1].length > 8192) throw new Error("Authentication required.");
  return match[1];
}
export function createPrivateChatAuthorization({ supabaseUrl, supabaseKey, fetchImpl = fetch } = {}) {
  if (typeof supabaseUrl !== "string" || !/^https:\/\/[^/]+$/.test(supabaseUrl) ||
      typeof supabaseKey !== "string" || !supabaseKey ||
      typeof fetchImpl !== "function") {
    throw new TypeError("Private chat authorization is not configured.");
  }
  async function request(path, token) {
    const response = await fetchImpl(supabaseUrl + path, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: "Bearer " + token,
        Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error("Private chat authorization denied.");
    return response.json();
  }
  async function verifyUser(authorizationHeader) {
    const token = readBearerToken(authorizationHeader);
    // Auth service verifies the JWT; never decode a client JWT as proof of identity.
    const user = await request("/auth/v1/user", token);
    if (!user || typeof user.id !== "string" || !UUID.test(user.id)) {
      throw new Error("Private chat authorization denied.");
    }
    return Object.freeze({ userId: user.id.toLowerCase(), token });
  }
  async function verifyConversation({ token, userId, conversationId }) {
    if (typeof userId !== "string" || !UUID.test(userId) ||
        typeof conversationId !== "string" || !UUID.test(conversationId)) {
      throw new Error("Conversation access denied.");
    }
    // Query as the authenticated user. RLS must only expose their own records.
    const path = "/rest/v1/ai_conversations?select=id%2Cuser_id&id=eq." +
      encodeURIComponent(conversationId) + "&limit=1";
    const rows = await request(path, token);
    if (!Array.isArray(rows) || rows.length !== 1 ||
        rows[0]?.id?.toLowerCase() !== conversationId.toLowerCase() ||
        rows[0]?.user_id?.toLowerCase() !== userId.toLowerCase()) {
      throw new Error("Conversation access denied.");
    }
    return true;
  }
  async function verifyUserMessage({ token, userId, conversationId, operationId, content }) {
    if (![userId, conversationId, operationId].every(v => typeof v === "string" && UUID.test(v)) ||
        typeof content !== "string" || !content.trim()) {
      throw new Error("User message verification denied.");
    }
    const path = "/rest/v1/ai_messages?select=id%2Cuser_id%2Cconversation_id%2Coperation_id%2Crole%2Ccontent" +
      "&user_id=eq." + encodeURIComponent(userId) +
      "&conversation_id=eq." + encodeURIComponent(conversationId) +
      "&operation_id=eq." + encodeURIComponent(operationId) + "&limit=1";
    const rows = await request(path, token);
    const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!row || row.user_id !== userId || row.conversation_id !== conversationId ||
        row.operation_id !== operationId || row.role !== "user" || row.content.trim() !== content.trim()) {
      throw new Error("User message verification denied.");
    }
    return true;
  }
  return Object.freeze({ verifyUser, verifyConversation, verifyUserMessage });
}
