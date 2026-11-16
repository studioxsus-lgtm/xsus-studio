import { describe, expect, it } from "vitest";
import { createContextWindowSelector } from "../../src/hyper-xsus-core/cross-cutting/context-window-selector.js";
describe("Hyper XSUS Core — context window selection", () => {
  it("keeps the newest contiguous messages in original order", () => {
    const result = createContextWindowSelector({ maxMessages: 2 }).select([
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
      { role: "user", content: "third" }
    ]);
    expect(result.messages.map(x => x.content)).toEqual(["second", "third"]);
    expect(result.omittedMessages).toBe(1);
    expect(result.truncatedMessages).toBe(false);
  });
  it("enforces aggregate code-point budget without truncating messages", () => {
    const result = createContextWindowSelector({ maxCodePoints: 3 }).select([
      { role: "user", content: "older" }, { role: "assistant", content: "😀ok" }
    ]);
    expect(result.messages.map(x => x.content)).toEqual(["😀ok"]);
    expect(result.usedCodePoints).toBe(3);
  });
  it("does not skip the newest message to include older messages", () => {
    const result = createContextWindowSelector({ maxCodePoints: 2 }).select([
      { role: "user", content: "a" }, { role: "assistant", content: "latest" }
    ]);
    expect(result.messages).toEqual([]);
    expect(result.omittedMessages).toBe(2);
  });
  it("rejects invalid roles and empty content", () => {
    const selector = createContextWindowSelector();
    expect(() => selector.select([{ role: "system", content: "x" }])).toThrow("role");
    expect(() => selector.select([{ role: "user", content: " " }])).toThrow("Empty");
  });
});
