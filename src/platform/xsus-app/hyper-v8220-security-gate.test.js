import { describe, expect, it } from "vitest";
import { assessHyperPersistenceSecurity as assess } from "./hyper-v8220-security-gate.js";

const denied = { select: false, insert: false, update: false, delete: false };
const complete = () => ({
  tableExists: true, rlsEnabled: true, forceRls: true,
  roles: { anon: { ...denied }, authenticated: { ...denied } },
  appendOnlyEnforced: true, immutableEvidenceVerified: true,
  serverRoleReviewed: true
});

describe("Hyper v8.2.20 persistence security gate", () => {
  it("fails closed on missing findings", () => {
    expect(assess().verified).toBe(false);
  });
  it("requires RLS and FORCE RLS", () => {
    const report = complete(); report.forceRls = false;
    expect(assess(report).blockers).toContain("FORCE_RLS_NOT_ENABLED");
  });
  it("rejects client write grants", () => {
    const report = complete(); report.roles.anon.insert = true;
    expect(assess(report).blockers).toContain("CLIENT_ROLE_PRIVILEGES_NOT_DENIED");
  });
  it("requires append-only enforcement", () => {
    const report = complete(); report.appendOnlyEnforced = false;
    expect(assess(report).blockers).toContain("APPEND_ONLY_NOT_VERIFIED");
  });
  it("never treats self-reported findings as live attestation", () => {
    const result = assess(complete());
    expect(result.verified).toBe(false);
    expect(result.blockers).toContain("LIVE_SECURITY_ATTESTATION_MISSING");
    expect(Object.isFrozen(result.blockers)).toBe(true);
  });
});
