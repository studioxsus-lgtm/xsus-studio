import { describe, expect, it, vi } from "vitest";
import { createXsusAppHyperGateway } from "../../platform/xsus-app/xsus-hyper-gateway.js";

describe("XSUS App Hyper-only gateway", () => {
  it("routes evidence verification exclusively through the injected Hyper adapter", async () => {
    const verifyEvidence = vi.fn(async payload => ({ ok: true, verified: true, observationId: payload.observationId }));
    const gateway = createXsusAppHyperGateway({ verifyEvidence });
    const payload = { observationId: "observation_123", accessToken: "test_token_1234567890" };
    await expect(gateway.execute("evidence.verify", payload))
      .resolves.toEqual({ ok: true, verified: true, observationId: "observation_123" });
    expect(verifyEvidence).toHaveBeenCalledExactlyOnceWith(payload);
    expect(Object.isFrozen(gateway)).toBe(true);
  });

  it.each(["application.plan", "application.build", "application.execute"])(
    "rejects unverified Hyper execution without calling any transport: %s",
    async capability => {
      const verifyEvidence = vi.fn();
      const gateway = createXsusAppHyperGateway({ verifyEvidence });
      await expect(gateway.execute(capability, { prompt: "Build app" }))
        .rejects.toThrow("not verified");
      expect(verifyEvidence).not.toHaveBeenCalled();
    }
  );

  it.each(["language.interpret", "language.respond", "chat", "ai-core", "unknown"])(
    "never routes language or legacy AI Core requests through Hyper: %s",
    async capability => {
      const verifyEvidence = vi.fn();
      const gateway = createXsusAppHyperGateway({ verifyEvidence });
      await expect(gateway.execute(capability, {})).rejects.toThrow();
      expect(verifyEvidence).not.toHaveBeenCalled();
    }
  );

  it("requires an explicit Hyper adapter", () => {
    expect(() => createXsusAppHyperGateway()).toThrow("required");
  });

  it.each([null, [], "invalid"])("rejects invalid evidence payloads: %j", async payload => {
    const verifyEvidence = vi.fn();
    const gateway = createXsusAppHyperGateway({ verifyEvidence });
    await expect(gateway.execute("evidence.verify", payload)).rejects.toThrow("Invalid Hyper verification payload.");
    expect(verifyEvidence).not.toHaveBeenCalled();
  });

  it("propagates verification failures without claiming success", async () => {
    const verifyEvidence = vi.fn(async () => { throw new Error("Hyper authorization failed."); });
    const gateway = createXsusAppHyperGateway({ verifyEvidence });
    await expect(gateway.execute("evidence.verify", { observationId: "a" }))
      .rejects.toThrow("Hyper authorization failed.");
  });
});
