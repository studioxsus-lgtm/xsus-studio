/**
 * Private chat HTTP boundary. Authentication and RLS authorization only.
 * Fail closed until a server-side assistant persistence writer is installed.
 * Never forward a client conversation ID into the public AI memory runtime.
 */
import { validatePrivateChatRequest } from "./private-chat-persistence-contract.js";
import { createPrivateChatAuthorization } from "./private-chat-authorization.js";

export function createPrivateChatHandler({
  supabaseUrl, supabaseKey, fetchImpl, authorize
} = {}) {
  const auth = authorize || createPrivateChatAuthorization({
    supabaseUrl, supabaseKey, fetchImpl
  });
  return async function handle({ authorization, body }) {
    let input;
    try {
      input = validatePrivateChatRequest(body);
    } catch {
      return { status: 400, data: { error: "Invalid private chat request." } };
    }
    if (!authorization) {
      return { status: 401, data: { error: "Authentication required." } };
    }
    try {
      const { userId, token } = await auth.verifyUser(authorization);
      await auth.verifyConversation({ userId, token, conversationId: input.conversationId });
    } catch {
      return { status: 403, data: { error: "Private conversation access denied." } };
    }
    // Intentionally do not generate or save a reply yet: a verified, idempotent
    // server-side persistence writer is required before this route can succeed.
    return { status: 501, data: { error: "Private reply persistence is not enabled." } };
  };
}
