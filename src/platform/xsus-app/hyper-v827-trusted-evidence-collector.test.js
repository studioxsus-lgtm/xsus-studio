import { describe, expect, it, vi } from "vitest";
import { createHyperTrustedEvidenceCollector as create } from "./hyper-v827-trusted-evidence-collector.js";

const readers = () => ({
  readAudit: vi.fn(async () => ({ verified: true, projectId: "audit" })),
  readCheckpoint: vi.fn(async () => ({ verified: true, projectId: "checkpoint" })),
  readBeforeRestart: vi.fn(async () => ({ recordId: "r1", digest: "d1" })),
  readAfterRestart: vi.fn(async () => ({ recordId: "r1", digest: "d1" })),
  verifyRenderRestart: vi.fn(async () => ({ verified: true }))
});

describe("Hyper v8.2.7 trusted evidence collector", () => {
  it("fails closed when readers are not configured", async () => {
    expect((await create().inspect()).blockers).toContain("TRUSTED_READERS_NOT_CONFIGURED");
  });
  it("rejects an unconfirmed restart", async () => {
    const r = readers();
    r.verifyRenderRestart = vi.fn(async () => ({ verified: false }));
    expect((await create(r).inspect()).verified).toBe(false);
  });
  it("rejects mismatched persistence digest", async () => {
    const r = readers();
    r.readAfterRestart = vi.fn(async () => ({ recordId: "r1", digest: "changed" }));
    expect((await create(r).inspect()).blockers).toContain("RECORD_DIGEST_MISMATCH");
  });
  it("rejects shared storage project", async () => {
    const r = readers();
    r.readCheckpoint = vi.fn(async () => ({ verified: true, projectId: "audit" }));
    expect((await create(r).inspect()).blockers).toContain("STORES_NOT_ISOLATED");
  });
  it("handles reader errors without exposing secrets", async () => {
    const r = readers();
    r.readAudit = vi.fn(async () => { throw Error("secret-token"); });
    const result = await create(r).inspect();
    expect(result.verified).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });
  it("compares controlled fixture observations", async () => {
    const result = await create(readers()).inspect();
    expect(result).toMatchObject({ verified: true, source: "server-owned-readers", blockers: [] });
    expect(Object.isFrozen(result)).toBe(true);
  });
});
