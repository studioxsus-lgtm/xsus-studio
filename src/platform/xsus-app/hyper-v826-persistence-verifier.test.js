import { describe, expect, it } from "vitest";
import { verifyHyperPersistenceEvidence as verify } from "./hyper-v826-persistence-verifier.js";

const sample = () => ({
  audit: { verified: true, projectId: "audit-project" },
  checkpoint: { verified: true, projectId: "checkpoint-project" },
  beforeRestart: { recordId: "record-1", digest: "digest-1" },
  afterRestart: { recordId: "record-1", digest: "digest-1" },
  renderRestartConfirmed: true
});

describe("Hyper v8.2.6 persistence evidence verifier", () => {
  it("rejects missing evidence", () => {
    expect(verify({}).verified).toBe(false);
    expect(verify({}).blockers).toContain("RESTART_OBSERVATIONS_MISSING");
  });
  it("rejects same Supabase project", () => {
    const evidence = sample();
    evidence.checkpoint.projectId = evidence.audit.projectId;
    expect(verify(evidence).blockers).toContain("STORES_NOT_ISOLATED");
  });
  it("rejects mismatched record digests", () => {
    const evidence = sample();
    evidence.afterRestart.digest = "changed";
    expect(verify(evidence).blockers).toContain("RECORD_DIGEST_MISMATCH");
  });
  it("rejects missing restart confirmation", () => {
    const evidence = sample();
    evidence.renderRestartConfirmed = false;
    expect(verify(evidence).blockers).toContain("RENDER_RESTART_NOT_CONFIRMED");
  });
  it("compares consistent caller evidence without contacting services", () => {
    const report = verify(sample());
    expect(report).toMatchObject({
      verified: true,
      source: "caller-supplied-evidence",
      blockers: []
    });
  });
  it("returns immutable report and blockers", () => {
    const report = verify(sample());
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.blockers)).toBe(true);
  });
});
