/**
 * Hyper XSUS Core — Context Window Selector v1.0.0.
 * Deterministic newest-first retention with complete message boundaries.
 * Never truncates individual messages; does not persist conversations.
 */
import { createTextBoundaryEngine } from "./text-boundary-engine.js";
export const CONTEXT_WINDOW_SELECTOR_VERSION = "1.0.0";
export function createContextWindowSelector({
  maxMessages = 8, maxCodePoints = 8192, maxMessageCodePoints = 2048
} = {}) {
  if (!Number.isSafeInteger(maxMessages) || maxMessages < 0 || maxMessages > 256 ||
      !Number.isSafeInteger(maxCodePoints) || maxCodePoints < 1 || maxCodePoints > 1000000)
    throw new TypeError("Invalid context window configuration.");
  const boundary = createTextBoundaryEngine({ maxCodePoints: maxMessageCodePoints });
  function select(messages) {
    if (!Array.isArray(messages) || messages.length > 10000)
      throw new TypeError("Invalid context window messages.");
    const normalized = messages.map(message => {
      if (!message || (message.role !== "user" && message.role !== "assistant"))
        throw new TypeError("Invalid context window role.");
      const content = boundary.normalize(message.content).text;
      if (!content.trim()) throw new TypeError("Empty context window message.");
      return Object.freeze({ role: message.role, content });
    });
    const retained = [];
    let used = 0;
    for (let i = normalized.length - 1; i >= 0 && retained.length < maxMessages; i--) {
      const size = Array.from(normalized[i].content).length;
      if (used + size > maxCodePoints) break;
      retained.push(normalized[i]);
      used += size;
    }
    retained.reverse();
    return Object.freeze({
      version: CONTEXT_WINDOW_SELECTOR_VERSION,
      messages: Object.freeze(retained), usedCodePoints: used,
      omittedMessages: messages.length - retained.length,
      truncatedMessages: false
    });
  }
  return Object.freeze({ version: CONTEXT_WINDOW_SELECTOR_VERSION, select });
}
