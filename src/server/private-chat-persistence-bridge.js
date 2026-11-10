/**
 * XSUS AI V3 — opt-in bridge between browser idempotent user writes
 * and the authenticated server reply transport.
 *
 * Existing Supabase write service normalizes messages without operationId.
 * Verify the persisted message ID, role, conversation and content; operationId
 * is verified by the underlying idempotent write adapter against the DB row.
 */
import { createPrivateChatRoundTrip } from "./private-chat-round-trip.js";
import { createPrivateReplyTransport } from "./private-reply-client-adapter.js";

export function createPrivateChatPersistenceBridge({
  supabase, writeService, endpoint, fetchImpl
} = {}) {
  if (typeof writeService?.save !== "function" ||
      typeof writeService?.invalidate !== "function") {
    throw new TypeError("Authenticated idempotent user write service required.");
  }
  if (typeof supabase?.auth?.getSession !== "function") {
    throw new TypeError("Authenticated Supabase session required.");
  }
  const reply = createPrivateReplyTransport({ supabase, endpoint, fetchImpl });
  let identity = null;
  let identityEpoch = 0;
  async function requireIdentity() {
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    if (error || !session?.user?.id || !session?.access_token) {
      invalidate();
      throw new Error("Authentication required.");
    }
    const current = session.user.id;
    if (identity !== null && identity !== current) {
      invalidate();
    }
    identity = current;
    return current;
  }
  const roundTrip = createPrivateChatRoundTrip({
    async saveUserMessage({ conversationId, operationId, content }) {
      const saved = await writeService.save({ conversationId, operationId, content });
      if (!saved || saved.conversationId?.toLowerCase() !== conversationId.toLowerCase() ||
          saved.role !== "user" || saved.content !== content ||
          typeof saved.id !== "string") {
        throw new Error("User message persistence verification failed.");
      }
      return { conversationId, operationId, content };
    },
    sendPrivateReply: reply
  });
  function invalidate() {
    identityEpoch += 1;
    identity = null;
    roundTrip.invalidate();
    writeService.invalidate();
  }
  return Object.freeze({
    async send(request) {
      const user = await requireIdentity();
      const token = identityEpoch;
      const result = await roundTrip.send(request);
      // Even completed/cached replies require a fresh account check.
      const { data, error } = await supabase.auth.getSession();
      if (error || data?.session?.user?.id !== user ||
          identityEpoch !== token) {
        invalidate();
        throw new Error("Private chat session changed.");
      }
      return result;
    },
    invalidate
  });
}
