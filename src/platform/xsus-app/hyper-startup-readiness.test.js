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
      .toMatchObject({ status: "NOT_CONFIGURED", tablesReachable: false, checks: {} });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("checks REST gateway and exactly two tables with GET and no row contents", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    expect(await checkHyperStartupReadiness({ env, fetchImpl }))
      .toMatchObject({ status: "TABLES_REACHABLE", tablesReachable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "https://example.supabase.co/rest/v1/",
      "https://example.supabase.co/rest/v1/hyper_runtime_evidence_bundles?select=observation_id&limit=0",
      "https://example.supabase.co/rest/v1/hyper_evidence_owners?select=observation_id&limit=0"
    ]);
    expect(fetchImpl.mock.calls[0][1].headers.Accept).toBe("application/openapi+json");
    for (const [url, options] of fetchImpl.mock.calls) {
      if (!url.endsWith("/rest/v1/")) {
        expect(new URL(url).searchParams.get("limit")).toBe("0");
        expect(options.headers.Accept).toBe("application/json");
      }
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
  it("classifies a forbidden table without leaking credentials", async () => {
    const fetchImpl = vi.fn(async url => ({
      ok: !url.includes("hyper_evidence_owners"),
      status: url.includes("hyper_evidence_owners") ? 403 : 200
    }));
    const result = await checkHyperStartupReadiness({ env, fetchImpl });
    expect(result.checks.hyper_evidence_owners).toEqual({
      reachable: false, category: "AUTHORIZATION", httpStatus: 403
    });
    expect(JSON.stringify(result)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
  });
  it("distinguishes missing tables from a timeout", async () => {
    const fetchImpl = vi.fn(async url => {
      if (url.includes("hyper_evidence_owners")) {
        const error = new Error("private detail");
        error.name = "TimeoutError";
        throw error;
      }
      return { ok: false, status: 404 };
    });
    const result = await checkHyperStartupReadiness({ env, fetchImpl });
    expect(result.checks.hyper_runtime_evidence_bundles.category)
      .toBe("TABLE_OR_ENDPOINT_NOT_FOUND");
    expect(result.checks.hyper_evidence_owners.category).toBe("TIMEOUT");
    expect(JSON.stringify(result)).not.toContain("private detail");
  });

  it("distinguishes rejected REST gateway credentials from table permissions", async () => {
    const fetchImpl = vi.fn(async url => ({
      ok: false, status: url.endsWith("/rest/v1/") ? 403 : 403
    }));
    const result = await checkHyperStartupReadiness({ env, fetchImpl });
    expect(result.gatewayReachable).toBe(false);
    expect(result.diagnosis).toBe("CHECK_API_KEY_OR_GATEWAY");
    expect(result.checks.restGateway.category).toBe("GATEWAY_AUTHORIZATION");
  });
  it("identifies table access failure when REST gateway works", async () => {
    const fetchImpl = vi.fn(async url => ({
      ok: url.endsWith("/rest/v1/"), status: url.endsWith("/rest/v1/") ? 200 : 403
    }));
    const result = await checkHyperStartupReadiness({ env, fetchImpl });
    expect(result.gatewayReachable).toBe(true);
    expect(result.diagnosis).toBe("CHECK_TABLE_PERMISSIONS_OR_SCHEMA");
  });

});
