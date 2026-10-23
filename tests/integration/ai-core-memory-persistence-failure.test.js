
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  processAIRequest,
  configureAICoreMemoryPersistence,
} from "../../src/core/ai-core.js";

import {
  clearAllMemory,
  getMemoryHistory,
} from "../../src/core/memory-engine.js";

describe("XSUS AI Core — Persistence failure handling", () => {
  afterEach(() => {
    configureAICoreMemoryPersistence(null);
    clearAllMemory();
    vi.restoreAllMocks();
  });

  test("ruan historikun në RAM kur ruajtja persistente dështon", async () => {
    const failingPersistence = {
      saveSession: vi.fn().mockRejectedValue(
        new Error("Simulated storage failure")
      ),
      restoreSession: vi.fn().mockResolvedValue({
        success: false,
        restored: false,
        reason: "SESSION_NOT_FOUND",
      }),
    };

    configureAICoreMemoryPersistence(failingPersistence);

    const sessionId = "persistence-failure-session";

    const result = await processAIRequest({
      query: "Testo qëndrueshmërinë e memories.",
      conversationId: sessionId,
      language: "sq",
    });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();

    const history = getMemoryHistory(sessionId);

    expect(history.length).toBeGreaterThan(0);

    expect(
      history.some(
        (message) =>
          message.content === "Testo qëndrueshmërinë e memories."
      )
    ).toBe(true);

    expect(failingPersistence.saveSession).toHaveBeenCalled();
  });
});
