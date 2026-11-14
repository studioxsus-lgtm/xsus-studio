import { describe, expect, it, vi } from "vitest";
import { createHyperRenderAttestor as create } from "./hyper-v8211-render-attestation.js";

const digest = "a".repeat(64);
const observations = () => ({
  before: { recordId: "r1", digest, deploymentId: "old", observationId: "o1",
    observedAt: "2026-11-14T10:00:00Z" },
  after: { recordId: "r1", digest, deploymentId: "new", observationId: "o2",
    observedAt: "2026-11-14T10:02:00Z" }
});
const event = () => ({
  provider: "render", authenticated: true, eventId: "e1",
  previousDeploymentId: "old", currentDeploymentId: "new",
  completedAt: "2026-11-14T10:01:00Z"
});

describe("Hyper v8.2.11 Render attestation boundary", () => {
  it("fails closed without provider", async () => {
    expect((await create().attest(observations())).verified).toBe(false);
  });
  it("rejects unauthenticated provider output", async () => {
    const readDeploymentEvent = vi.fn(async () => ({ ...event(), authenticated: false }));
    expect((await create({ readDeploymentEvent }).attest(observations())).blockers)
      .toContain("RENDER_EVENT_UNTRUSTED");
  });
  it("rejects wrong provider", async () => {
    const readDeploymentEvent = vi.fn(async () => ({ ...event(), provider: "other" }));
    expect((await create({ readDeploymentEvent }).attest(observations())).verified).toBe(false);
  });
  it("rejects invalid chronology", async () => {
    const readDeploymentEvent = vi.fn(async () => ({ ...event(), completedAt: "2026-11-14T10:05:00Z" }));
    expect((await create({ readDeploymentEvent }).attest(observations())).blockers)
      .toContain("RESTART_CHRONOLOGY_INVALID");
  });
  it("returns a structurally valid result for fixture provider", async () => {
    const readDeploymentEvent = vi.fn(async () => event());
    const report = await create({ readDeploymentEvent }).attest(observations());
    expect(report.verified).toBe(true);
    expect(report.source).toBe("server-owned-render-provider");
    expect(readDeploymentEvent).toHaveBeenCalledWith();
  });
  it("sanitizes provider errors", async () => {
    const readDeploymentEvent = vi.fn(async () => { throw Error("sensitive"); });
    const report = await create({ readDeploymentEvent }).attest(observations());
    expect(report.verified).toBe(false);
    expect(JSON.stringify(report)).not.toContain("sensitive");
  });
});
