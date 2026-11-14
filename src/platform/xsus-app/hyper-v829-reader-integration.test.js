import { describe, expect, it, vi } from "vitest";
import { createHyperV829ReaderIntegration as create } from "./hyper-v829-reader-integration.js";

const config = () => ({
  audit: { url: "https://audit.example.org", serviceRoleKey: "fixture-a", table: "audit_events", recordId: "a1" },
  checkpoint: { url: "https://checkpoint.example.org", serviceRoleKey: "fixture-b", table: "checkpoints", recordId: "c1" },
  beforeRestart: { table: "audit_events", recordId: "r1" },
  afterRestart: { table: "audit_events", recordId: "r1" },
  verifyRenderRestart: vi.fn(async () => ({ verified: false })),
  fetchImpl: vi.fn(async (url) => ({
    ok: true,
    json: async () => [{ id: url.includes("checkpoints") ? "c1" : url.includes("r1") ? "r1" : "a1", digest: "d1" }]
  }))
});

describe("Hyper v8.2.9 reader integration", () => {
  it("rejects incomplete mapping", () => {
    expect(() => create({})).toThrow();
  });
  it("rejects identical projects", () => {
    const c = config();
    c.checkpoint.url = c.audit.url;
    expect(() => create(c)).toThrow();
  });
  it("rejects identical credentials", () => {
    const c = config();
    c.checkpoint.serviceRoleKey = c.audit.serviceRoleKey;
    expect(() => create(c)).toThrow();
  });
  it("requires independent restart verification", async () => {
    const c = config();
    const result = await create(c).inspect();
    expect(result.verified).toBe(false);
    expect(result.blockers).toContain("RENDER_RESTART_NOT_CONFIRMED");
    expect(c.fetchImpl).toHaveBeenCalledTimes(4);
    for (const [, options] of c.fetchImpl.mock.calls) expect(options.method).toBe("GET");
  });
});
