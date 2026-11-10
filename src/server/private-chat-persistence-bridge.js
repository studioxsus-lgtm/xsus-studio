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
  const reply = createPrivateReplyTransport({ supabase, endpoint, fetchImpl });
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
  return Object.freeze({
    send: roundTrip.send,
    invalidate() {
      roundTrip.invalidate();
      writeService.invalidate();
    }
  });
}
