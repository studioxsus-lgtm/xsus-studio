/**
 * XSUS AI — server-only assistant message persistence adapter.
 * Not enabled by default. Never expose service-role credentials to browsers.
 * The caller MUST verify the JWT and conversation ownership before invoking.
 * Database constraints and policies must additionally enforce integrity.
 */
import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assistantOperationId(operationId) {
  if (typeof operationId !== "string" || !UUID.test(operationId)) {
    throw new TypeError("Invalid operation ID.");
  }
  const bytes = createHash("sha256").update("xsus-assistant-v1:" + operationId.toLowerCase()).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.subarray(0, 16).toString("hex");
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-");
}

export function createAssistantMessageWriter({ supabaseUrl, serviceRoleKey, fetchImpl = fetch } = {}) {
  if (typeof supabaseUrl !== "string" || !/^https:\/\/[^/]+$/.test(supabaseUrl) ||
      typeof serviceRoleKey !== "string" || !serviceRoleKey ||
      typeof fetchImpl !== "function") {
    throw new TypeError("Assistant message writer is not configured.");
  }
  const endpoint = supabaseUrl + "/rest/v1/ai_messages";
  async function request(method, path, body) {
    const response = await fetchImpl(endpoint + path, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation"
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000)
    });
    const payload = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, payload };
  }
  function checked(row, { userId, conversationId, operationId }) {
    if (!row || row.user_id !== userId || row.conversation_id !== conversationId ||
        row.operation_id !== operationId || row.role !== "assistant" ||
        typeof row.content !== "string" || !row.content.trim()) {
      throw new Error("Assistant persistence verification failed.");
    }
    return Object.freeze({ id: row.id, content: row.content, operationId });
  }
  return Object.freeze({
    async save({ userId, conversationId, operationId, answer }) {
      if (![userId, conversationId, operationId].every(v => typeof v === "string" && UUID.test(v)) ||
          typeof answer !== "string" || !answer.trim() || answer.length > 8000) {
        throw new TypeError("Invalid assistant persistence request.");
      }
      const owner = userId.toLowerCase(), conversation = conversationId.toLowerCase();
      const assistantId = assistantOperationId(operationId);
      const expected = { userId: owner, conversationId: conversation, operationId: assistantId };
      const columns = "id,user_id,conversation_id,operation_id,role,content";
      const inserted = await request("POST", "?select=" + columns, {
        user_id: owner, conversation_id: conversation, operation_id: assistantId,
        role: "assistant", content: answer
      });
      if (inserted.ok && Array.isArray(inserted.payload) && inserted.payload.length === 1) {
        return checked(inserted.payload[0], expected);
      }
      // Only the unique-operation conflict can be resolved as an idempotent retry.
      if (inserted.status !== 409 || inserted.payload?.code !== "23505") {
        throw new Error("Assistant persistence failed.");
      }
      const existing = await request("GET", "?select=" + columns +
        "&user_id=eq." + encodeURIComponent(owner) +
        "&conversation_id=eq." + encodeURIComponent(conversation) +
        "&operation_id=eq." + encodeURIComponent(assistantId) + "&limit=1");
      if (!existing.ok || !Array.isArray(existing.payload) || existing.payload.length !== 1) {
        throw new Error("Assistant persistence conflict could not be verified.");
      }
      return checked(existing.payload[0], expected);
    }
  });
}
