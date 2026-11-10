/**
 * XSUS AI — authenticated private chat orchestration.
 * Authorization precedes generation. Never pass a browser conversation ID
 * to AI Core memory. Reply persistence is optional and fails closed.
 */
import { validatePrivateChatRequest } from "./private-chat-persistence-contract.js";
import { createPrivateChatAuthorization } from "./private-chat-authorization.js";

export function createPrivateChatHandler({
  supabaseUrl, supabaseKey, fetchImpl, authorize, generate, writer
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
    let userId, token;
    try {
      ({ userId, token } = await auth.verifyUser(authorization));
      await auth.verifyConversation({ userId, token, conversationId: input.conversationId });
      await auth.verifyUserMessage({ userId, token, conversationId: input.conversationId,
        operationId: input.operationId, content: input.query });
    } catch {
      return { status: 403, data: { error: "Private conversation access denied." } };
    }
    if (typeof generate !== "function" || typeof writer?.save !== "function") {
      return { status: 501, data: { error: "Private reply persistence is not enabled." } };
    }
    try {
      // Only pass validated query to the independent AI Core.
      const result = await generate({ query: input.query });
      if (!result || typeof result.answer !== "string" || !result.answer.trim() || result.error) {
        return { status: 422, data: { error: "AI response unavailable." } };
      }
      // Re-check ownership and the persisted user operation before a privileged write.
      await auth.verifyConversation({ userId, token, conversationId: input.conversationId });
      await auth.verifyUserMessage({ userId, token, conversationId: input.conversationId,
        operationId: input.operationId, content: input.query });
      const saved = await writer.save({
        userId, conversationId: input.conversationId,
        operationId: input.operationId, answer: result.answer
      });
      if (!saved || typeof saved.content !== "string" || !saved.content.trim()) {
        throw new Error("Invalid persistence result.");
      }
      return { status: 200, data: { answer: saved.content, conversationId: input.conversationId,
        operationId: input.operationId, persisted: true } };
    } catch {
      return { status: 503, data: { error: "Private reply could not be safely saved." } };
    }
  };
}
