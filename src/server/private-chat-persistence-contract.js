/**
 * XSUS AI Core HTTP boundary — private chat persistence input contract.
 * Pure validation only. Does not authenticate, authorize, query or write data.
 * Never trust client-provided userId, role, or assistant response text.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validatePrivateChatRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Invalid private chat request.");
  }
  const conversationId = body.conversationId;
  const operationId = body.operationId;
  const query = body.query;
  if (typeof conversationId !== "string" || !UUID.test(conversationId)) {
    throw new TypeError("Invalid conversation ID.");
  }
  if (typeof operationId !== "string" || !UUID.test(operationId)) {
    throw new TypeError("Invalid operation ID.");
  }
  if (typeof query !== "string" || !query.trim() || query.length > 8000) {
    throw new TypeError("Invalid query.");
  }
  return Object.freeze({ conversationId: conversationId.toLowerCase(),
    operationId: operationId.toLowerCase(), query: query.trim() });
}
export function requireVerifiedConversationOwner({ authenticatedUserId, conversationOwnerId }) {
  if (typeof authenticatedUserId !== "string" || !UUID.test(authenticatedUserId) ||
      typeof conversationOwnerId !== "string" || !UUID.test(conversationOwnerId) ||
      authenticatedUserId.toLowerCase() !== conversationOwnerId.toLowerCase()) {
    throw new Error("Conversation access denied.");
  }
  return true;
}
