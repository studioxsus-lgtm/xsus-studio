import { describe, expect, it } from "vitest";
import { inspectHyperV81ActivationGate as inspect } from "./hyper-v81-activation-gate.js";

const configured = () => ({
  XSUS_HYPER_V81_ENABLED: "true",
  SUPABASE_URL: "https://audit-example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "audit-service-secret",
  XSUS_HYPER_V81_AUDIT_KEY: "a".repeat(40),
  XSUS_HYPER_V81_AUDIT_KEY_ID: "audit-v1",
  XSUS_HYPER_CHECKPOINT_URL: "https://checkpoint-example.supabase.co",
  XSUS_HYPER_CHECKPOINT_SERVICE_ROLE_KEY: "checkpoint-service-secret",
  XSUS_HYPER_CHECKPOINT_SIGNING_KEY: "c".repeat(40),
  XSUS_HYPER_CHECKPOINT_KEY_ID: "checkpoint-v1"
});

describe("Hyper v8.2.3 fail-closed activation gate", () => {
  it("blocks activation even when configuration shape is complete", () => {
    const report = inspect(configured());
    expect(report.configurationReady).toBe(true);
    expect(report.activationAllowed).toBe(false);
    expect(report.blockers).toContain("LIVE_STORAGE_NOT_VERIFIED");
    expect(report.blockers).toContain("RESTART_PERSISTENCE_NOT_VERIFIED");
  });

  it("blocks disabled integration", () => {
    expect(inspect({ ...configured(), XSUS_HYPER_V81_ENABLED: "false" }).blockers)
      .toContain("V81_NOT_ENABLED");
  });

  it("rejects the legacy filesystem integration route", () => {
    expect(inspect({ ...configured(), XSUS_HYPER_APP_ENABLED: "true" }).blockers)
      .toContain("LEGACY_FILESYSTEM_HYPER_ROUTE_ENABLED");
  });

  it("never leaks credentials", () => {
    const report = inspect(configured());
    expect(JSON.stringify(report)).not.toContain("audit-service-secret");
    expect(JSON.stringify(report)).not.toContain("checkpoint-service-secret");
  });

  it("returns immutable report, evidence and blockers", () => {
    const report = inspect(configured());
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.evidence)).toBe(true);
    expect(Object.isFrozen(report.blockers)).toBe(true);
  });
});
