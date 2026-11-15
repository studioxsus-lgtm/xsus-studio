import { describe, it, expect, vi } from "vitest";
import { checkHyperStartupReadiness } from "./hyper-startup-readiness.js";

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-secret"
};

describe("Hyper startup readiness (read-only)", () => {
  it("returns NOT_CONFIGURED without credentials or network", async () => {
    const fetchImpl = vi.fn();
    expect(await checkHyperStartupReadiness({ env: {}, fetchImpl }))
      .toEqual({ status: "NOT_CONFIGURED", tablesReachable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("checks exactly two tables with GET and no row contents", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    expect(await checkHyperStartupReadiness({ env, fetchImpl }))
      .toEqual({ status: "TABLES_REACHABLE", tablesReachable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetchImpl.mock.calls) {
      expect(url).toContain("select=observation_id&limit=0");
      expect(options.method).toBe("GET");
      expect(options.redirect).toBe("error");
    }
  });
  it("fails closed when one table is inaccessible", async () => {
    const fetchImpl = vi.fn(async url => ({ ok: !url.includes("hyper_evidence_owners") }));
    expect((await checkHyperStartupReadiness({ env, fetchImpl })).status)
      .toBe("TABLES_UNAVAILABLE");
  });
  it("never includes the service key in result", async () => {
    const fetchImpl = vi.fn(async () => { throw Error("secret: test-only-secret"); });
    const result = await checkHyperStartupReadiness({ env, fetchImpl });
    expect(JSON.stringify(result)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
    expect(result.status).toBe("TABLES_UNAVAILABLE");
  });
});
