import { describe, expect, it } from "vitest";
import { inspectHyperRestartIntegrity as inspect } from "./hyper-v8210-restart-integrity.js";

const digest = "a".repeat(64);
const fixture = () => ({
  before: { recordId: "record_1", digest, deploymentId: "deploy_old",
    observationId: "observation_before", observedAt: "2026-11-14T10:00:00Z" },
  restart: { verified: true, previousDeploymentId: "deploy_old",
    currentDeploymentId: "deploy_new", eventId: "restart_1",
    completedAt: "2026-11-14T10:01:00Z" },
  after: { recordId: "record_1", digest, deploymentId: "deploy_new",
    observationId: "observation_after", observedAt: "2026-11-14T10:02:00Z" }
});

describe("Hyper v8.2.10 restart integrity", () => {
  it("accepts structurally consistent fixture evidence", () => {
    const result = inspect(fixture());
    expect(result.verified).toBe(true);
    expect(result.source).toBe("unattested-input-validation");
  });
  it("rejects missing evidence", () => {
    expect(inspect().verified).toBe(false);
  });
  it("rejects reused observations", () => {
    const f = fixture(); f.after.observationId = f.before.observationId;
    expect(inspect(f).blockers).toContain("OBSERVATION_REUSED");
  });
  it("rejects impossible chronology", () => {
    const f = fixture(); f.after.observedAt = "2026-11-14T09:59:00Z";
    expect(inspect(f).blockers).toContain("RESTART_CHRONOLOGY_INVALID");
  });
  it("rejects unchanged deployment identity", () => {
    const f = fixture(); f.restart.currentDeploymentId = "deploy_old";
    f.after.deploymentId = "deploy_old";
    expect(inspect(f).blockers).toContain("DEPLOYMENT_UNCHANGED");
  });
  it("rejects altered record digest", () => {
    const f = fixture(); f.after.digest = "b".repeat(64);
    expect(inspect(f).blockers).toContain("RECORD_DIGEST_MISMATCH");
  });
  it("rejects mismatched deployment evidence", () => {
    const f = fixture(); f.after.deploymentId = "other_deploy";
    expect(inspect(f).blockers).toContain("DEPLOYMENT_EVIDENCE_MISMATCH");
  });
  it("returns immutable result", () => {
    const result = inspect(fixture());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.blockers)).toBe(true);
  });
});
