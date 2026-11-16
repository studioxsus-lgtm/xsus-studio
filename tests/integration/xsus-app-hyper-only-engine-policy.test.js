import { describe, expect, it } from "vitest";
import {
  XSUS_APP_ENGINE_POLICY,
  XSUS_APP_ENGINE_POLICY_VERSION,
  resolveXsusAppEngineCapability
} from "../../platform/xsus-app/xsus-engine-policy.js";

describe("XSUS App Hyper-only engine selection", () => {
  it("selects Hyper Core for execution and keeps language independent", () => {
    expect(XSUS_APP_ENGINE_POLICY_VERSION).toBe("1.0.0");
    expect(XSUS_APP_ENGINE_POLICY.executionEngine).toBe("hyper-xsus-core");
    expect(XSUS_APP_ENGINE_POLICY.languageEngine).toBe("separate-language-core");
    expect(XSUS_APP_ENGINE_POLICY.legacyAiCoreEnabled).toBe(false);
    expect(Object.isFrozen(XSUS_APP_ENGINE_POLICY)).toBe(true);
  });

  it("allows only the existing Hyper evidence verification capability", () => {
    expect(resolveXsusAppEngineCapability("evidence.verify")).toEqual({
      engine: "hyper-xsus-core",
      available: true,
      adapter: "xsus-hyper-evidence-client"
    });
  });

  it.each(["application.plan", "application.build", "application.execute"])(
    "does not claim unverified Hyper execution is available: %s",
    capability => {
      const result = resolveXsusAppEngineCapability(capability);
      expect(result.engine).toBe("hyper-xsus-core");
      expect(result.available).toBe(false);
      expect(result.reason).toMatch(/not verified/);
      expect(Object.isFrozen(result)).toBe(true);
    }
  );

  it.each(["language.interpret", "language.respond"])(
    "reserves language tasks for the separate language core: %s",
    capability => {
      const result = resolveXsusAppEngineCapability(capability);
      expect(result.engine).toBe("separate-language-core");
      expect(result.available).toBe(false);
    }
  );

  it("never routes unknown capabilities to XSUS AI Core as a fallback", () => {
    for (const capability of ["chat", "ai-core", "unknown", "", null]) {
      const result = resolveXsusAppEngineCapability(capability);
      expect(result).toMatchObject({ engine: null, available: false });
    }
  });
});
