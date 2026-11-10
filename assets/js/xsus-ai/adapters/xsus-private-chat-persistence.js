/**
 * XSUS AI V3 — Private Chat Persistence Boundary
 * Phase 22.16.5.8.14 — opt-in; no UI activation.
 *
 * Maps a local chat conversation to an authenticated database conversation.
 * Never treats local UUIDs as proof of database ownership.
 * No browser storage, no service-role credentials, no assistant-role writes.
 */
export const PRIVATE_CHAT_PERSISTENCE_VERSION = "1.0.0";

export function createPrivateChatPersistence({
  createConversation,
  saveUserMessage,
  createOperationId
} = {}) {
  if (typeof createConversation !== "function" ||
      typeof saveUserMessage !== "function" ||
      typeof createOperationId !== "function") {
    throw new TypeError("Conversation creation, user write and operation ID dependencies are required.");
  }
  const pendingConversations = new Map();
  const committedConversations = new Map();
  const operations = new Map();
  let epoch = 0;
  let destroyed = false;

  function active(token) {
    if (destroyed || epoch !== token) throw new Error("Private chat persistence invalidated.");
  }
  function requireLocalId(id) {
    if (typeof id !== "string" || !id.trim()) throw new TypeError("Invalid local conversation ID.");
    return id;
  }
  function registerPersistedConversation(id) {
    if (destroyed) throw new Error("Private chat persistence invalidated.");
    // This is a mapping hint only. The database must still enforce ownership via RLS.
    if (typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new TypeError("Invalid persisted conversation ID.");
    }
    if (pendingConversations.has(id)) {
      throw new Error("Conversation creation is already pending.");
    }
    committedConversations.set(id, id);
    return id;
  }
  function ensureConversation(localId) {
    if (committedConversations.has(localId)) {
      return Promise.resolve(committedConversations.get(localId));
    }
    if (pendingConversations.has(localId)) return pendingConversations.get(localId);
    const token = epoch;
    const task = (async () => {
      const saved = await createConversation({ title: "New conversation" });
      active(token);
      if (!saved || typeof saved.id !== "string" || !saved.id.trim()) {
        throw new Error("Invalid persisted conversation.");
      }
      committedConversations.set(localId, saved.id);
      return saved.id;
    })();
    pendingConversations.set(localId, task);
    void task.finally(() => {
      if (pendingConversations.get(localId) === task) pendingConversations.delete(localId);
    }).catch(() => {});
    return task;
  }
  async function save({ localConversationId, content, localMessageId } = {}) {
    if (destroyed) throw new Error("Private chat persistence invalidated.");
    const localId = requireLocalId(localConversationId);
    if (typeof localMessageId !== "string" || !localMessageId.trim()) {
      throw new TypeError("Invalid local message ID.");
    }
    if (typeof content !== "string" || !content.trim() || content.length > 12000) {
      throw new TypeError("Invalid message content.");
    }
    const token = epoch;
    const operationKey = localId + ":" + localMessageId;
    const previous = operations.get(operationKey);
    if (previous && previous.content !== content) {
      throw new Error("Message ID reused with different content.");
    }
    const operationId = previous?.operationId ?? createOperationId();
    if (!previous) operations.set(operationKey, { operationId, content });
    const conversationId = await ensureConversation(localId);
    active(token);
    const result = await saveUserMessage({ conversationId, operationId, content });
    active(token);
    if (!result || result.conversationId?.toLowerCase() !== conversationId.toLowerCase() ||
        result.role !== "user" || result.content !== content ||
        typeof result.id !== "string") {
      throw new Error("Persisted user message does not match request.");
    }
    return result;
  }
  async function saveWithReceipt(request = {}) {
    const result = await save(request);
    const key = request.localConversationId + ":" + request.localMessageId;
    const operation = operations.get(key);
    if (!operation || operation.content !== request.content) {
      throw new Error("Private operation receipt unavailable.");
    }
    return Object.freeze({
      conversationId: result.conversationId,
      operationId: operation.operationId,
      messageId: result.id,
      content: result.content,
      role: result.role
    });
  }
  function invalidate() {
    if (destroyed) return false;
    epoch += 1;
    pendingConversations.clear();
    committedConversations.clear();
    operations.clear();
    return true;
  }
  function destroy() { invalidate(); destroyed = true; }
  return Object.freeze({ save, saveWithReceipt, registerPersistedConversation, invalidate, destroy });
}
