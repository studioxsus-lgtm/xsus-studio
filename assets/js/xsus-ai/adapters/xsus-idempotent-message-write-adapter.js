/**
 * XSUS AI V3 — Idempotent Message Write Adapter
 * Phase 22.16.5.8.11.1
 * Version 1.0.0
 *
 * Dependency-injected persistence boundary. Does not access Supabase directly.
 * Callers MUST supply authenticated identity, RLS-protected insert and lookup.
 * Database UNIQUE(user_id, conversation_id, operation_id) is required.
 * Never use a service-role key in a browser.
 */
export const IDEMPOTENT_MESSAGE_WRITE_VERSION = "1.0.0";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function uuid(value, label) {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value.toLowerCase();
}
function validContent(content) {
  if (typeof content !== "string" || !content.trim() || content.length > 12000) {
    throw new TypeError("Invalid message content.");
  }
  return content;
}
function validateStored(record, { userId, conversationId, operationId, content }) {
  if (!record || typeof record !== "object" ||
      uuid(record.user_id, "stored user ID") !== userId ||
      uuid(record.conversation_id, "stored conversation ID") !== conversationId ||
      uuid(record.operation_id, "stored operation ID") !== operationId ||
      record.role !== "user" || record.content !== content) {
    throw new Error("Stored operation does not match request.");
  }
  uuid(record.id, "stored message ID");
  return record;
}
export function createIdempotentMessageWriteAdapter({ getUserId, insertMessage, findMessage } = {}) {
  if (typeof getUserId !== "function" || typeof insertMessage !== "function" ||
      typeof findMessage !== "function") {
    throw new TypeError("Authenticated identity, insert and lookup functions are required.");
  }
  async function save({ operationId, conversationId, content } = {}) {
    const operation = uuid(operationId, "operation ID");
    const conversation = uuid(conversationId, "conversation ID");
    const message = validContent(content);
    const owner = uuid(await getUserId(), "user ID");
    const request = Object.freeze({
      operationId: operation, conversationId: conversation, content: message, userId: owner
    });
    const verifyIdentity = async () => {
      if (uuid(await getUserId(), "user ID") !== owner) {
        throw new Error("Authentication changed during message write.");
      }
    };
    // Lookup first for retries after a completed write or lost response.
    let stored = await findMessage(request);
    await verifyIdentity();
    if (stored) return validateStored(stored, request);
    try {
      stored = await insertMessage(request);
    } catch (error) {
      // A competing request may have committed the same key.
      // Only a UNIQUE violation permits read-back; other errors propagate.
      if (error?.code !== "23505") throw error;
      stored = await findMessage(request);
      if (!stored) throw new Error("Duplicate operation could not be verified.");
    }
    await verifyIdentity();
    return validateStored(stored, request);
  }
  return Object.freeze({ save });
}
